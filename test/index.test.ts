import { hello } from "../src";

describe("hello", () => {
  it("should return hello", () => {
    expect(hello()).toBe("hello");
  });
});
