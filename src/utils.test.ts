import { diff as diffUtil } from "./utils";

describe("Diff", function () {
    it("should return an array of differences for two objects without nested object", function () {
        var a = {
            a: "a",
            b: 2,
            c: "three",
        };

        var b = {
            b: 2,
            c: 3,
            d: "dee",
        };

        var diff = diffUtil(a, b);

        expect(diff).toEqual(["a", "c", "d"]);
    });

    it("should return an array of differences for two objects with nested objects", function () {
        var a = {
            a: "a",
            b: 2,
            c: "three",
            sub: {
                e: 5,
                f: "six",
                subsub: {
                    g: "gee",
                    h: "h",
                },
            },
            suba: {
                j: "djay",
            },
        };

        var b = {
            b: 2,
            c: 3,
            d: "dee",
            sub: {
                e: 5,
                f: 6,
                subsub: {
                    g: "gee",
                    i: "I",
                },
            },
            subb: {
                k: "k",
            },
        };

        var diff = diffUtil(a, b);

        expect(diff.sort()).toEqual(
            [
                "a",
                "c",
                "d",
                "sub.f",
                "sub.subsub.h",
                "sub.subsub.i",
                "suba",
                "subb",
            ].sort()
        );
    });
});
