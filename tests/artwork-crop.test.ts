import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const cropSource = readFileSync("card-design/artwork-crop.js", "utf8");

type CropResult = {
  mode: string;
  focusX: number;
  focusY: number;
  xMode: string;
  yMode: string;
};

type Cropper = {
  apply: (
    image: Record<string, any>,
    direction?: Record<string, unknown> | null,
    options?: { id?: string; label?: string },
  ) => CropResult | null;
};

function makePixels(
  width: number,
  height: number,
  hotspot = { x0: 0.70, y0: 0.65, x1: 0.95, y1: 0.95 },
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = (y * width + x) * 4;
      const nx = x / width;
      const ny = y / height;
      const hot = nx >= hotspot.x0 && nx <= hotspot.x1 && ny >= hotspot.y0 && ny <= hotspot.y1;
      const checker = (x + y) % 3 === 0;
      data[pixel] = hot ? (checker ? 235 : 150) : 40;
      data[pixel + 1] = hot ? (checker ? 120 : 70) : 42;
      data[pixel + 2] = hot ? (checker ? 80 : 45) : 45;
      data[pixel + 3] = 255;
    }
  }
  return data;
}

function loadCropper(
  pixelsFactory: (width: number, height: number) => Uint8ClampedArray,
  overrides: Record<string, unknown> = {},
): Cropper {
  const window: Record<string, any> = { GAUNTLET_ART_DIRECTION: overrides };
  const document = {
    createElement(tag: string) {
      expect(tag).toBe("canvas");
      const canvas = { width: 0, height: 0 } as Record<string, any>;
      canvas.getContext = () => ({
        drawImage() {},
        getImageData() {
          return { data: pixelsFactory(canvas.width, canvas.height) };
        },
      });
      return canvas;
    },
  };

  vm.runInNewContext(cropSource, { window, document, console });
  return window.GauntletArtworkCrop as Cropper;
}

function makeImage(
  naturalWidth: number,
  naturalHeight: number,
  frameWidth: number,
  frameHeight: number,
  kind: "card" | "territory" = "card",
) {
  const frame = {
    clientWidth: frameWidth,
    clientHeight: frameHeight,
    classList: {
      contains(name: string) {
        return kind === "card" ? name === "card-art" : name === "territory-art";
      },
    },
  };

  return {
    naturalWidth,
    naturalHeight,
    currentSrc: `synthetic-${naturalWidth}x${naturalHeight}-${kind}`,
    src: "",
    style: {} as Record<string, string>,
    dataset: {} as Record<string, string>,
    closest: () => frame,
  };
}

describe("smart artwork cropping", () => {
  it("keeps a manual axis while still smart-positioning the other axis", () => {
    const cropper = loadCropper(makePixels);
    const image = makeImage(400, 300, 400, 300);

    const result = cropper.apply(image, { focusX: 25, zoom: 1.3 });

    expect(result).not.toBeNull();
    expect(result?.xMode).toBe("manual");
    expect(result?.focusX).toBe(25);
    expect(result?.yMode).toBe("smart");
    expect(result?.focusY).toBeGreaterThan(50);
  });

  it("accounts for zoom-induced cropping on both axes", () => {
    const cropper = loadCropper(makePixels);
    const image = makeImage(400, 300, 400, 300);

    const result = cropper.apply(image, { zoom: 1.25 });

    expect(result?.xMode).toBe("smart");
    expect(result?.yMode).toBe("smart");
  });

  it("follows a distinct subject instead of defaulting to the source center", () => {
    const cropper = loadCropper((width, height) => makePixels(
      width,
      height,
      { x0: 0.72, y0: 0.20, x1: 0.98, y1: 0.80 },
    ));
    const image = makeImage(480, 270, 400, 300);

    const result = cropper.apply(image);

    expect(result?.xMode).toBe("smart");
    expect(result?.yMode).toBe("default");
    expect(result?.focusX).toBeGreaterThan(50);
  });

  it("merges stable per-card overrides with authored direction per property", () => {
    const cropper = loadCropper(makePixels, {
      example: { focusX: 20, zoom: 1.2 },
    });
    const image = makeImage(400, 300, 400, 300);

    const result = cropper.apply(image, { focusY: 35 }, { id: "example" });

    expect(result?.focusX).toBe(20);
    expect(result?.focusY).toBe(35);
    expect(image.style.transform).toBe("scale(1.2)");
  });

  it("does not analyze artwork when smart positioning is disabled", () => {
    const cropper = loadCropper(() => {
      throw new Error("analysis should not run");
    });
    const image = makeImage(480, 270, 400, 300);

    const result = cropper.apply(image, { smart: false, focusY: 20 });

    expect(result?.mode).toBe("manual");
    expect(result?.focusX).toBe(50);
    expect(result?.focusY).toBe(20);
  });
});
