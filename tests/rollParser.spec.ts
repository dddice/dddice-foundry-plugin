/** @format */

import { describe, expect, it } from '@jest/globals';

import { convertFVTTDiceEquation } from '../src/module/rollFormatConverters';

describe('/roll commands', () => {
  it('/roll 1d20', () => {
    const actual = convertFVTTDiceEquation(
      {
        class: 'Roll',
        options: {},
        dice: [
          {
            class: 'Die',
            options: {},
            evaluated: true,
            number: 1,
            faces: 20,
            modifiers: [],
            results: [
              {
                result: 4,
                active: true,
              },
            ],
          },
        ],
        _formula: '1d20',
        terms: [
          {
            class: 'Die',
            options: {},
            evaluated: true,
            number: 1,
            faces: 20,
            modifiers: [],
            results: [
              {
                result: 4,
                active: true,
              },
            ],
          },
        ],
        total: 4,
        evaluated: true,
      },
      'test-theme',
    );
    expect(actual).toEqual({
      dice: [{ type: 'd20', theme: 'test-theme', value: 4 }],
      operator: {},
    });
  });

  it('/roll floor(2d6/3)', () => {
    const actual = convertFVTTDiceEquation(
      {
        class: 'DamageRoll',
        options: {
          critRule: 'double-damage',
        },
        _formula: '{floor(2d6/3)}',
        dice: [
          {
            class: 'Die',
            options: {},
            evaluated: true,
            number: 2,
            faces: 6,
            modifiers: [],
            results: [
              {
                result: 2,
                active: true,
              },
              {
                result: 1,
                active: true,
              },
            ],
          },
        ],
        total: 1,
        evaluated: true,
      },
      'test-theme',
    );
    expect(actual).toEqual({
      dice: [
        { type: 'd6', theme: 'test-theme', value: 2 },
        { type: 'd6', theme: 'test-theme', value: 1 },
      ],
      operator: { '/': '3', round: 'down' },
    });
  });
});

describe('dnd character sheet rolls', () => {
  it('tie break initative', () => {
    const actual = convertFVTTDiceEquation(
      {
        class: 'D20Roll',
        options: {
          flavor: 'Initiative',
          halflingLucky: false,
          critical: null,
          fumble: null,
          event: {
            originalEvent: {
              isTrusted: true,
            },
            type: 'click',
            target: {
              jQuery364088552297875112741: {
                events: {
                  click: [
                    {
                      type: 'click',
                      origType: 'click',
                      data: null,
                      guid: 251,
                      namespace: '',
                    },
                  ],
                },
              },
            },
            currentTarget: {
              jQuery364088552297875112741: {
                events: {
                  click: [
                    {
                      type: 'click',
                      origType: 'click',
                      data: null,
                      guid: 251,
                      namespace: '',
                    },
                  ],
                },
              },
            },
            relatedTarget: null,
            timeStamp: 3894472,
            jQuery36408855229787511274: true,
            delegateTarget: {
              jQuery364088552297875112741: {
                events: {
                  click: [
                    {
                      type: 'click',
                      origType: 'click',
                      data: null,
                      guid: 251,
                      namespace: '',
                    },
                  ],
                },
              },
            },
            handleObj: {
              type: 'click',
              origType: 'click',
              data: null,
              guid: 251,
              namespace: '',
            },
            data: null,
            result: {},
          },
          configured: true,
          advantageMode: 0,
          rollMode: 'publicroll',
        },
        dice: [
          {
            class: 'Die',
            options: {},
            evaluated: true,
            number: 1,
            faces: 20,
            modifiers: [],
            results: [
              {
                result: 10,
                active: true,
              },
            ],
          },
        ],
        _formula: '1d20 + 0 + 0 + 0.1',
        terms: [
          {
            class: 'Die',
            options: {},
            evaluated: true,
            number: 1,
            faces: 20,
            modifiers: [],
            results: [
              {
                result: 10,
                active: true,
              },
            ],
          },
          {
            class: 'OperatorTerm',
            options: {},
            evaluated: true,
            operator: '+',
          },
          {
            class: 'NumericTerm',
            options: {},
            evaluated: true,
            number: 0,
          },
          {
            class: 'OperatorTerm',
            options: {},
            evaluated: true,
            operator: '+',
          },
          {
            class: 'NumericTerm',
            options: {},
            evaluated: true,
            number: 0,
          },
          {
            class: 'OperatorTerm',
            options: {},
            evaluated: true,
            operator: '+',
          },
          {
            class: 'NumericTerm',
            options: {},
            evaluated: true,
            number: 0.1,
          },
        ],
        total: 10.1,
        evaluated: true,
      },
      'test-theme',
    );
    expect(actual).toEqual({
      dice: [
        { type: 'd20', theme: 'test-theme', value: 10 },
        { type: 'mod', value: 0 },
        { type: 'mod', value: 0 },
      ],
      operator: {},
    });
  });
});
describe('pathfinder character sheet rolls', () => {
  it('attacks with a rapier', () => {
    const actual = convertFVTTDiceEquation(
      {
        class: 'DamageRoll',
        options: {
          critRule: 'double-damage',
        },
        _formula: '1d20 + 2',
        dice: [
          {
            class: 'Die',
            options: {},
            evaluated: true,
            number: 1,
            faces: 20,
            modifiers: [],
            results: [
              {
                result: 20,
                active: true,
              },
            ],
          },
        ],
      },
      'test-theme',
    );
    expect(actual).toEqual({
      dice: [
        { type: 'd20', theme: 'test-theme', value: 20 },
        { type: 'mod', value: 2 },
      ],
      operator: {},
    });
  });

  it('Critical rapier damage', () => {
    const actual = convertFVTTDiceEquation(
      {
        class: 'DamageRoll',
        options: {
          rollerId: '7eb0HerNDdaTSEUh',
          damage: {
            name: 'Damage Roll: Rapier',
            notes: [],
            traits: ['attack'],
            materials: [],
            modifiers: [
              {
                slug: 'str',
                label: 'Strength',
                modifier: 2,
                type: 'ability',
                ability: 'str',
                adjustments: [],
                force: false,
                enabled: true,
                ignored: false,
                source: null,
                custom: false,
                damageType: null,
                damageCategory: null,
                predicate: [],
                critical: null,
                traits: [],
                notes: '',
                hideIfDisabled: false,
                kind: 'modifier',
              },
              {
                slug: 'deadly-d8',
                label: 'Deadly d8',
                diceNumber: 1,
                dieSize: 'd8',
                critical: true,
                category: null,
                damageType: 'piercing',
                override: null,
                ignored: false,
                enabled: true,
                custom: false,
                predicate: [],
                selector: 'wRBZlwmZ3F3rYGft-damage',
              },
            ],
            domains: [
              'wRBZlwmZ3F3rYGft-damage',
              'rapier-damage',
              'strike-damage',
              'damage',
              'sword-weapon-group-damage',
              'rapier-base-type-damage',
              'str-damage',
              'untrained-damage',
            ],
            damage: {
              base: [
                {
                  diceNumber: 1,
                  dieSize: 'd6',
                  modifier: 0,
                  damageType: 'piercing',
                  category: null,
                  materials: [],
                },
              ],
              dice: [
                {
                  slug: 'deadly-d8',
                  label: 'Deadly d8',
                  diceNumber: 1,
                  dieSize: 'd8',
                  critical: true,
                  category: null,
                  damageType: 'piercing',
                  override: null,
                  ignored: false,
                  enabled: true,
                  custom: false,
                  predicate: [],
                  selector: 'wRBZlwmZ3F3rYGft-damage',
                },
              ],
              modifiers: [
                {
                  slug: 'str',
                  label: 'Strength',
                  modifier: 2,
                  type: 'ability',
                  ability: 'str',
                  adjustments: [],
                  force: false,
                  enabled: true,
                  ignored: false,
                  source: null,
                  custom: false,
                  damageType: null,
                  damageCategory: null,
                  predicate: [],
                  critical: null,
                  traits: [],
                  notes: '',
                  hideIfDisabled: false,
                  kind: 'modifier',
                },
              ],
              ignoredResistances: [],
              formula: {
                criticalFailure: null,
                failure: '{1d6[piercing]}',
                success: '{(1d6 + 2)[piercing]}',
                criticalSuccess: '{(2 * (1d6 + 2) + 1d8)[piercing]}',
              },
              breakdown: {
                criticalFailure: [],
                failure: ['1d6 Piercing'],
                success: ['1d6 Piercing', 'Strength +2'],
                criticalSuccess: ['1d6 Piercing', 'Strength +2', 'Deadly d8 +1d8'],
              },
            },
          },
          degreeOfSuccess: 3,
          ignoredResistances: [],
          critRule: 'double-damage',
        },
        dice: [
          {
            class: 'Die',
            options: {
              crit: 2,
            },
            evaluated: true,
            number: 1,
            faces: 6,
            modifiers: [],
            results: [
              {
                result: 6,
                active: true,
              },
            ],
          },
          {
            class: 'Die',
            options: {},
            evaluated: true,
            number: 1,
            faces: 8,
            modifiers: [],
            results: [
              {
                result: 5,
                active: true,
              },
            ],
          },
        ],
        _formula: '{(2 * (1d6 + 2) + 1d8)[piercing]}',
        terms: [
          {
            class: 'InstancePool',
            options: {},
            evaluated: true,
            terms: ['(2 * (1d6 + 2) + 1d8)[piercing]'],
            modifiers: [],
            rolls: [
              {
                class: 'DamageInstance',
                options: {
                  flavor: 'piercing',
                  critRule: 'double-damage',
                },
                dice: [],
                formula: '(2 * (1d6 + 2) + 1d8)[piercing]',
                terms: [
                  {
                    class: 'Grouping',
                    options: {
                      flavor: 'piercing',
                    },
                    evaluated: true,
                    term: {
                      class: 'ArithmeticExpression',
                      options: {},
                      evaluated: true,
                      operator: '+',
                      operands: [
                        {
                          class: 'ArithmeticExpression',
                          options: {},
                          evaluated: true,
                          operator: '*',
                          operands: [
                            {
                              class: 'NumericTerm',
                              options: {},
                              evaluated: true,
                              number: 2,
                            },
                            {
                              class: 'Grouping',
                              options: {
                                crit: 2,
                              },
                              evaluated: true,
                              term: {
                                class: 'ArithmeticExpression',
                                options: {
                                  crit: 2,
                                },
                                evaluated: true,
                                operator: '+',
                                operands: [
                                  {
                                    class: 'Die',
                                    options: {
                                      crit: 2,
                                    },
                                    evaluated: true,
                                    number: 1,
                                    faces: 6,
                                    modifiers: [],
                                    results: [
                                      {
                                        result: 6,
                                        active: true,
                                      },
                                    ],
                                  },
                                  {
                                    class: 'NumericTerm',
                                    options: {
                                      crit: 2,
                                    },
                                    evaluated: true,
                                    number: 2,
                                  },
                                ],
                              },
                            },
                          ],
                        },
                        {
                          class: 'Die',
                          options: {},
                          evaluated: true,
                          number: 1,
                          faces: 8,
                          modifiers: [],
                          results: [
                            {
                              result: 5,
                              active: true,
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
                total: 21,
                evaluated: true,
              },
            ],
            results: [
              {
                result: 21,
                active: true,
              },
            ],
          },
        ],
        total: 21,
        evaluated: true,
      },
      'test-theme',
    );
    expect(actual).toEqual({
      dice: [
        { type: 'd6', theme: 'test-theme', value: 6 },
        { type: 'mod', value: 2 },
        { type: 'd8', theme: 'test-theme', value: 5 },
      ],
      operator: { '*': { 2: [0, 1] } },
    });
  });

  describe('D&D 5e character sheet rolls', () => {
    it('Halfling rolls athletics', () => {
      const actual = convertFVTTDiceEquation(
        {
          class: 'D20Roll',
          options: {
            flavor: 'Athletics Skill Check',
            advantageMode: 0,
            defaultRollMode: 'publicroll',
            rollMode: 'publicroll',
            critical: 20,
            fumble: 1,
            halflingLucky: true,
            configured: true,
          },
          dice: [
            {
              class: 'Die',
              options: {
                critical: 20,
                fumble: 1,
              },
              evaluated: true,
              number: 1,
              faces: 20,
              modifiers: ['r1=1'],
              results: [
                {
                  result: 5,
                  active: true,
                },
              ],
            },
          ],
          _formula: '1d20r1=1 + 2 + 0 + 2',
          terms: [
            {
              class: 'Die',
              options: {
                critical: 20,
                fumble: 1,
              },
              evaluated: true,
              number: 1,
              faces: 20,
              modifiers: ['r1=1'],
              results: [
                {
                  result: 5,
                  active: true,
                },
              ],
            },
            {
              class: 'OperatorTerm',
              options: {},
              evaluated: true,
              operator: '+',
            },
            {
              class: 'NumericTerm',
              options: {},
              evaluated: true,
              number: 2,
            },
            {
              class: 'OperatorTerm',
              options: {},
              evaluated: true,
              operator: '+',
            },
            {
              class: 'NumericTerm',
              options: {},
              evaluated: true,
              number: 0,
            },
            {
              class: 'OperatorTerm',
              options: {},
              evaluated: true,
              operator: '+',
            },
            {
              class: 'NumericTerm',
              options: {},
              evaluated: true,
              number: 2,
            },
          ],
          total: 9,
          evaluated: true,
        },
        'test-theme',
      );
      expect(actual).toEqual({
        dice: [
          { type: 'd20', theme: 'test-theme', value: 5 },
          { type: 'mod', value: 2 },
          { type: 'mod', value: 0 },
          { type: 'mod', value: 2 },
        ],
        operator: {},
      });
    });
  });
});

describe('re-rolls', () => {
  it('2d6r<=2[slashing] + 5[Slashing] + 2[Slashing]', () => {
    const actual = convertFVTTDiceEquation(
      {
        data: {},
        options: {},
        dice: [
          {
            isIntermediate: false,
            options: {
              flavor: 'slashing',
            },
            _evaluated: true,
            number: 2,
            faces: 6,
            modifiers: ['r<=2'],
            results: [
              {
                result: 3,
                active: true,
              },
              {
                result: 1,
                active: false,
                rerolled: true,
              },
              {
                result: 5,
                active: true,
              },
            ],
          },
          {
            isIntermediate: false,
            options: {},
            _evaluated: true,
            operator: '+',
          },
          {
            isIntermediate: false,
            options: {
              flavor: 'Slashing',
            },
            _evaluated: true,
            number: 5,
          },
          {
            isIntermediate: false,
            options: {},
            _evaluated: true,
            operator: '+',
          },
          {
            isIntermediate: false,
            options: {
              flavor: 'Slashing',
            },
            _evaluated: true,
            number: 2,
          },
        ],
        terms: [
          {
            isIntermediate: false,
            options: {
              flavor: 'slashing',
            },
            _evaluated: true,
            number: 2,
            faces: 6,
            modifiers: ['r<=2'],
            results: [
              {
                result: 3,
                active: true,
              },
              {
                result: 1,
                active: false,
                rerolled: true,
              },
              {
                result: 5,
                active: true,
              },
            ],
          },
          {
            isIntermediate: false,
            options: {},
            _evaluated: true,
            operator: '+',
          },
          {
            isIntermediate: false,
            options: {
              flavor: 'Slashing',
            },
            _evaluated: true,
            number: 5,
          },
          {
            isIntermediate: false,
            options: {},
            _evaluated: true,
            operator: '+',
          },
          {
            isIntermediate: false,
            options: {
              flavor: 'Slashing',
            },
            _evaluated: true,
            number: 2,
          },
        ],
        _dice: [],
        _formula: '2d6r<=2[slashing] + 5[Slashing] + 2[Slashing]',
        _evaluated: true,
        _total: 15,
      },
      'test-theme',
    );
    expect(actual).toEqual({
      dice: [
        { type: 'd6', theme: 'test-theme', value: 3 },
        { type: 'd6', theme: 'test-theme', value: 5 },
        { type: 'mod', value: 5 },
        { type: 'mod', value: 2 },
      ],
      operator: {},
    });
  });
});

describe("Savage Word's Character sheets", () => {
  it('rolls athletics', () => {
    const actual = convertFVTTDiceEquation(
      {
        class: 'TraitRoll',
        options: {
          modifiers: [],
          groupRoll: false,
          rerollable: true,
        },
        dice: [
          {
            class: 'Die',
            options: {
              flavor: 'Athletics',
            },
            evaluated: true,
            number: 1,
            faces: 4,
            modifiers: ['x'],
            results: [
              {
                result: 4,
                active: true,
                exploded: true,
              },
              {
                result: 4,
                active: true,
                exploded: true,
              },
              {
                result: 4,
                active: true,
                exploded: true,
              },
              {
                result: 3,
                active: true,
              },
            ],
          },
          {
            class: 'Die',
            options: {
              flavor: 'Wild Die',
            },
            evaluated: true,
            number: 1,
            faces: 6,
            modifiers: ['x'],
            results: [
              {
                result: 2,
                active: true,
              },
            ],
          },
        ],
        _formula: '{1d4x[Athletics],1d6x[Wild Die]}kh',
        terms: [
          {
            class: 'PoolTerm',
            options: {},
            evaluated: true,
            terms: ['1d4x[Athletics]', '1d6x[Wild Die]'],
            modifiers: ['kh'],
            rolls: [
              {
                class: 'Roll',
                options: {},
                dice: [],
                formula: '1d4x[Athletics]',
                terms: [
                  {
                    class: 'Die',
                    options: {
                      flavor: 'Athletics',
                    },
                    evaluated: true,
                    number: 1,
                    faces: 4,
                    modifiers: ['x'],
                    results: [
                      {
                        result: 4,
                        active: true,
                        exploded: true,
                      },
                      {
                        result: 4,
                        active: true,
                        exploded: true,
                      },
                      {
                        result: 4,
                        active: true,
                        exploded: true,
                      },
                      {
                        result: 3,
                        active: true,
                      },
                    ],
                  },
                ],
                total: 15,
                evaluated: true,
              },
              {
                class: 'Roll',
                options: {},
                dice: [],
                formula: '1d6x[Wild Die]',
                terms: [
                  {
                    class: 'Die',
                    options: {
                      flavor: 'Wild Die',
                    },
                    evaluated: true,
                    number: 1,
                    faces: 6,
                    modifiers: ['x'],
                    results: [
                      {
                        result: 2,
                        active: true,
                      },
                    ],
                  },
                ],
                total: 2,
                evaluated: true,
              },
            ],
            results: [
              {
                result: 15,
                active: true,
              },
              {
                result: 2,
                active: false,
                discarded: true,
              },
            ],
          },
        ],
        total: 15,
        evaluated: true,
      },
      'test-theme',
    );

    expect(actual).toEqual({
      dice: [
        { theme: 'test-theme', type: 'd4', value: '15' },
        { theme: 'test-theme', type: 'd6', value: '2' },
      ],
      operator: { k: 'h1' },
    });
  });
});
