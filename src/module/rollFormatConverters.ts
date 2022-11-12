/** @format */

import { IRoll, IRollValue } from 'dddice-js';
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
  dice: IRoll;
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
  const fvttRollTerms = Object.entries(
    dddiceRolls.values.reduce((prev, current): { [id: string]: DieAggregation } => {
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
    }, {}),
  ).reduce(
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

export function convertFVTTRollModelToDddiceRollModel(fvttRolls: Roll[]): {
  dice: IRoll;
  operator: object;
} {
  const theme = game.settings.get('dddice', 'theme');
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
