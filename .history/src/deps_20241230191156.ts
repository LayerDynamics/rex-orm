export { assertEquals, assertThrows } from "testing/asserts";
import "reflect-metadata";
// @ts-ignore: Reflect exists in global scope after importing reflect-metadata
export const Reflect = globalThis.Reflect;
