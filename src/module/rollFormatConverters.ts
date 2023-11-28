/** @format */

import { IDiceRoll, IRoll, IRollValue, Operator, parseRollEquation } from 'dddice-js';

import createLogger from '../module/log';

const log = createLogger('module');

function convertD100toD10x(theme, value) {
  return [
    {
      theme,
      type: 'd10x',
      value: Math.ceil(value / 10 - 1) === 0 ? 10 : Math.ceil(value / 10 - 1),
      value_to_display: `${Math.ceil(value / 10 - 1) * 10}`,
    },
    { theme, type: 'd10', value: ((value - 1) % 10) + 1 },
  ];
}

export function convertDddiceRollModelToFVTTRollModel(dddiceRolls: IRoll): Roll {
  interface DieAggregation {
    count: number;
    values: number[];
    themes: string[];
  }

  const modifiers = dddiceRolls.operator
    ? Object.entries(dddiceRolls.operator).map(([key, value]) => `${key}${value}`)
    : [];

  const dieAggregations: Record<string, DieAggregation> = dddiceRolls.values.reduce(
    (prev, current): { [id: string]: DieAggregation } => {
      if (prev[current.type]) {
        prev[current.type] = {
          values: [...prev[current.type].values, current],
          count: prev[current.type].count + (current.type === 'mod' ? current.vaule : 1),
          themes: [...prev[current.type].themes, current.theme],
        };
      } else {
        prev[current.type] = {
          values: [current],
          count: current.type === 'mod' ? current.value : 1,
          themes: [current.theme],
        };
      }
      return prev;
    },
    {},
  );

  log.debug('dieAggregations', dieAggregations);

  if (dieAggregations?.d10x?.count > 0 && dieAggregations?.d10?.count > 0) {
    dieAggregations.d100 = { values: [], count: 0, themes: [] };
    const d10 = dieAggregations.d10;
    const d10x = dieAggregations.d10x;
    delete dieAggregations.d10;
    delete dieAggregations.d10x;
    let i;
    for (i = 0; i < d10x.count && i < d10.count; ++i) {
      dieAggregations.d100.values[i] = {
        value: d10.values[i].value + d10x.values[i].value,
        value_to_display:
          parseInt(d10.values[i].value_to_display) + parseInt(d10x.values[i].value_to_display),
      };
      dieAggregations.d100.count++;
      dieAggregations.d100.themes[i] = d10x.themes[i];
    }
    log.debug('i', i);
    if (i < d10.count) {
      dieAggregations.d10 = { values: [], count: 0, themes: [] };
    }
    if (i < d10x.count) {
      dieAggregations.d10x = { values: [], count: 0, themes: [] };
    }
    while (i < d10x.count || i < d10.count) {
      if (i < d10.count) {
        dieAggregations.d10.values.push(d10.values[i]);
        dieAggregations.d10.count++;
        dieAggregations.d10.themes.push(d10.themes[i]);
      }
      if (i < d10x.count) {
        dieAggregations.d10x.values.push(d10x.values[i]);
        dieAggregations.d10x.count++;
        dieAggregations.d10x.themes.push(d10x.themes[i]);
      }
      ++i;
    }
  }

  log.debug('dieAggregations', dieAggregations);

  const fvttRollTerms = Object.entries(dieAggregations).reduce(
    //@ts-ignore
    (prev: DiceTerm[], [type, { count, values, themes }]: [string, DieAggregation]): DiceTerm[] => {
      if (type === 'mod') {
        prev.push(new OperatorTerm({ operator: count >= 0 ? '+' : '-' }).evaluate());
        prev.push(new NumericTerm({ number: count >= 0 ? count : -1 * count }).evaluate());
      } else {
        if (prev.length > 0) prev.push(new OperatorTerm({ operator: '+' }).evaluate());
        prev.push(
          Die.fromData({
            faces: type === 'd10x' ? 100 : parseInt(type.substring(1)),
            number: count,
            options: { appearance: { colorset: themes } },
            modifiers,
            results: values.map((value: IRollValue) => ({
              active: true,
              discarded: value.is_dropped,
              result: parseInt(value.value_to_display),
            })),
          } as any as RollTerm),
        );
      }
      return prev;
    },
    [],
  );
  log.debug('generated dice terms', fvttRollTerms);
  return Roll.fromTerms(fvttRollTerms);
}

export function convertFVTTRollModelToDddiceRollModel(
  fvttRolls: Roll[],
  theme: string,
): {
  dice: IDiceRoll[];
  operator: Operator;
} {
  let operator;
  const flattenedRollEquation: any = [];
  fvttRolls.map(roll => {
    const stack: any = [];

    let curr: any = roll;
    while (curr) {
      log.debug('curr.rolls', curr.rolls);
      log.debug('stack', stack);
      if (curr.rolls) {
        curr.rolls.map(i => stack.push(i));
      } else if (curr.terms) {
        curr.terms.map(i => stack.push(i));
      } else if (curr.term) {
        stack.push(curr.term);
      } else if (curr.operands) {
        if (curr.operator !== '*') {
          stack.push(curr.operands[0]);
          stack.push({ operator: curr.operator });
        }
        stack.push(curr.operands[1]);
      } else {
        flattenedRollEquation.unshift(curr);
      }
      curr = stack.pop();
    }
    log.debug('flattenedRollEquation', flattenedRollEquation);
  });

  let multIndex = 0;
  return {
    dice: flattenedRollEquation
      .reduce((prev, next) => {
        // reduce to combine operators + or - with the numeric term after them

        if (next instanceof NumericTerm) {
          if (prev.length > 0) {
            const multiplier =
              (prev[prev.length - 1].operator === '-' ? -1 : 1) * (next.options.crit ?? 1);

            prev[prev.length - 1] = { type: 'mod', value: next.number * multiplier, theme };
          } else {
            prev.push({ type: 'mod', value: next.number, theme });
          }
        } else if (next.rolls && next.rolls.length > 0) {
          log.debug(
            'found some nested rolls',
            next.rolls.flatMap(roll => roll.terms),
          );
          // for pathfinder 2e
          next.rolls.map(roll => roll.terms.map(term => prev.push(term)));
        } else {
          prev.push(next);
        }
        return prev;
      }, [])
      .flatMap(term => {
        log.debug('term', term);
        log.debug('term.faces', term.faces);
        log.debug('term.results', term.results);
        log.debug('term.results && term.faces', term.results && term.faces);
        if (term.results && term.faces) {
          return term.results.flatMap(result => {
            operator = {
              ...operator,
              ...term.modifiers.reduce((prev, current) => {
                const keep = current.match(/k(l|h)?(\d+)?/);
                if (keep) {
                  if (keep.length == 3) {
                    prev['k'] = `${keep[1]}${keep[2]}`;
                  } else if (keep.length == 2) {
                    prev['k'] = `${keep[1]}1`;
                  } else if (keep.length == 1) {
                    if (prev === 'k') {
                      prev['k'] = 'h1';
                    }
                  }
                }
                return prev;
              }, {}),
            };

            if (term.options?.crit && !operator['*']) {
              operator['*'] = { [term.options.crit]: [] };
            }
            if (term.faces === 100) {
              if (term.options?.crit) {
                operator['*'][term.options.crit].push(multIndex++);
                operator['*'][term.options.crit].push(multIndex++);
              }
              return convertD100toD10x(theme, result.result);
            }
            if (term.faces === 0 || (!operator.k && !result.active)) {
              return null;
            } else {
              if (term.options?.crit) {
                operator['*'][term.options.crit].push(multIndex++);
              }
              return { type: `d${term.faces}`, value: result.result, theme };
            }
          });
        } else if (term.type === 'mod') {
          if (term.options?.crit) {
            operator['*'][term.options.crit].push(multIndex++);
          }
          return term;
        } else {
          return null;
        }
      })
      .filter(i => i),
    operator,
  };
}

export function convertFVTTDiceEquation(
  roll: Roll[],
  theme: string,
): {
  dice: IDiceRoll[];
  operator: Operator;
  label?: string;
} {
  const values = [];
  roll.dice.forEach(
    die =>
      // because ready set roll sends dice with
      // 0 for faces to represent modifiers we need
      // to check if faces is truthy
      die.faces &&
      die.results.forEach(
        result => !result.rerolled && !result.explode && values.push(result.result),
      ),
  );

  // need to use _formula even though its private
  // because for round(), ceil() and floor()
  // the public formula returns the wrong formula
  const equation = roll._formula
    .toLowerCase()
    // remove spaces
    .replace(/\s+/g, '')
    // +- -> -
    .replace(/\+-/g, '-')
    // remove roll text labels
    .replace(/\[.*?]/g, '')
    // replace empty parens () with (0)
    .replace(/\(\)/g, '(0)')
    // remove unsupported operators
    .replace(/(r|rr|ro|x|xo)([+\-,}<>= ])/g, '$2')
    .replace(/(r|rr|ro|x|xo)(\d+|$)/g, '')
    // replace comparators as we don't understand those
    .replace(/[><=]=?\d+/g, '')
    // add implied 1 for kh dh kl & dl
    .replace(/([kd][hl])(\D|$)/g, '$11$2');
  return parseRollEquation(equation, theme, values);
}
