/** @format */

import { IRoll } from 'dddice-js';
import createLogger from '../module/log';
const log = createLogger('module');

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
        return [
          { type: `d10`, value: result.result % 10, theme },
          {
            type: `d10x`,
            value: Math.floor(result.result / 10),
            value_to_display: `${Math.floor(result.result / 10)}0`,
            theme,
          },
        ];
      } else {
        return { type: `d${term.faces}`, value: result.result, theme };
      }
    });
  });
  return { operator, dice };
}

export function convertDddiceRollModelToFVTTRollModel(dddiceRolls: IRoll): Roll {
  const fvttRollTerms = Object.entries(
    dddiceRolls.values
      .filter(die => !die.is_dropped)
      .reduce((prev, current) => {
        if (prev[current.type]) {
          prev[current.type] = {
            values: [...prev[current.type].values, current.value],
            count: prev[current.type].count + (current.type === 'mod' ? current.vaule : 1),
          };
        } else {
          prev[current.type] = {
            values: [parseInt(current.value_to_display)],
            count: current.type === 'mod' ? current.value : 1,
          };
        }
        return prev;
      }, {}),
  ).reduce((prev: DiceTerm[], [type, { count, values }]) => {
    if (type === 'mod') {
      prev.push(new OperatorTerm({ operator: count >= 0 ? '+' : '-' }).evaluate());
      prev.push(new NumericTerm({ number: count >= 0 ? count : -1 * count }).evaluate());
    } else {
      if (prev.length > 0) prev.push(new OperatorTerm({ operator: '+' }).evaluate());
      prev.push(
        Die.fromData({
          faces: type === 'd10x' ? 100 : parseInt(type.substring(1)),
          number: count,
          results: values.map(value => ({ active: true, discarded: false, result: value })),
        }),
      );
    }
    return prev;
  }, []);
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
                if (term.modifiers.some(x => x === 'kh1' || x === 'kh')) {
                  operator = { k: 'h1' };
                } else if (term.modifiers.some(x => x === 'kl1' || x === 'kl')) {
                  operator = { k: 'l1' };
                }
                if (term.faces === 100) {
                  return [
                    { type: `d10`, value: result.result % 10, theme },
                    {
                      type: `d10x`,
                      value: Math.floor(result.result / 10),
                      value_to_display: `${Math.floor(result.result / 10)}0`,
                      theme,
                    },
                  ];
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
