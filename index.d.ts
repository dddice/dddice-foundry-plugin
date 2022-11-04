/** @format */

declare namespace OperatorTerm {
  interface TermData extends DiceTerm.TermData {
    operator: string;
  }
}

declare class OperatorTerm extends DiceTerm {
  constructor(termData?: Partial<OperatorTerm.TermData>);
}

declare class NumericTerm extends DiceTerm {}
