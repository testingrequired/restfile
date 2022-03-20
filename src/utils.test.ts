import { sortObject } from "./utils";

describe("utils", () => {
  describe("sortObject", () => {
    it("should sort a deeply nested mixed type object/array", () => {
      expect(
        sortObject({
          b: [{ d: 2, f: 3, c: 4, e: 5 }],
          a: { blue: true, apple: true },
        })
      ).toEqual({
        a: {
          apple: true,
          blue: true,
        },
        b: [
          {
            c: 4,
            d: 2,
            e: 5,
            f: 3,
          },
        ],
      });
    });
  });
});
