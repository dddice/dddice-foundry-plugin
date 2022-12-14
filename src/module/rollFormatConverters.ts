/** @format */

import { IDiceRoll, IRoll, IRollValue } from 'dddice-js';
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

export function convertDiceSoNiceRollToDddiceRoll(
  roll,
  theme,
): {
  dice: IDiceRoll[];
  operator: object;
} {
  let operator;
  const dice = roll.dice.flatMap(term => {
    return term.results.flatMap(result => {
      if (term.modifiers.indexOf('kh1') !== -1) {
        operator = { k: 'h1' };
      } else if (term.modifiers.indexOf('kl1') !== -1) {
        operator = { k: 'l1' };
      }
      if (term.faces === 100) {
        return convertD100toD10x(theme, result.result);
      } else {
        return { type: `d${term.faces}`, value: result.result, theme };
      }
    });
  });
  return { operator, dice };
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
          }),
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
  operator: object;
} {
  let operator;
  return {
    dice: fvttRolls
      .flatMap(roll =>
        roll.terms
          .reduce((prev, next) => {
            // reduce to combine operators + or - with the numeric term after them
            if (next instanceof NumericTerm) {
              if (prev.length > 0) {
                const multiplier = prev[prev.length - 1].operator === '-' ? -1 : 1;
                prev[prev.length - 1] = { type: 'mod', value: next.number * multiplier, theme };
              }
            } else {
              prev.push(next);
            }
            return prev;
          }, [])
          .flatMap(term => {
            if (term instanceof DiceTerm) {
              return term.results.flatMap(result => {
                operator = term.modifiers.reduce((prev, current) => {
                  const keep = current.match(/k(l|h)?(\d+)?/);
                  if (keep.length == 3) {
                    prev['k'] = `${keep[1]}${keep[2]}`;
                  } else if (keep.length == 2) {
                    prev['k'] = `${keep[1]}1`;
                  } else if (keep.length == 1) {
                    if (prev === 'k') {
                      prev['k'] = 'h1';
                    }
                  }
                  return prev;
                }, {});
                if (term.faces === 100) {
                  return convertD100toD10x(theme, result.result);
                } else {
                  return { type: `d${term.faces}`, value: result.result, theme };
                }
              });
            } else if (term.type === 'mod') {
              return term;
            } else {
              return null;
            }
          }),
      )
      .filter(i => i),
    operator,
  };
}
