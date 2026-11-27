/**
 * Shader diorama 3D (Tahap 5H langkah a3). Semua GLSL di satu tempat supaya
 * mudah diperiksa. three.js menyiapkan awalan GLSL 3.00 ES (atribut
 * `position`/`uv`, matriks kamera, `gl_FragColor`, `texture2D`), dan
 * `#include <colorspace_fragment>` menyandikan keluaran ke ruang warna target.
 *
 * Satuan cahaya mengikuti three.js (fisik): irradiansi × albedo / π, sehingga
 * sprite dan permukaan Lambert diterangi dengan angka yang sama.
 */

/** Pola Bayer 4×4 untuk dither (memudar di pintu, anti-belang). */
const BAYER = /* glsl */ `
const float BAYER[16] = float[16](
    0.0, 8.0, 2.0, 10.0,
    12.0, 4.0, 14.0, 6.0,
    3.0, 11.0, 1.0, 9.0,
    15.0, 7.0, 13.0, 5.0
);

float bayer(vec2 fragCoord) {
    ivec2 p = ivec2(mod(floor(fragCoord), 4.0));

    return (BAYER[p.y * 4 + p.x] + 0.5) / 16.0;
}
`;

// ---- Pasca: layar penuh ------------------------------------------------------

export const FULLSCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Turun setengah resolusi (filter dual Kawase, 5 sampel). Untuk tingkat bloom
 * pertama, piksel di bawah ambang kecerahan dibuang lebih dulu.
 */
export const DOWNSAMPLE_FRAGMENT = /* glsl */ `
uniform sampler2D tInput;
uniform vec2 uTexel;
uniform float uBright;
uniform float uThreshold;
varying vec2 vUv;

vec3 tap(vec2 uv) {
    vec3 c = texture2D(tInput, uv).rgb;

    if (uBright > 0.5) {
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c *= smoothstep(uThreshold, uThreshold + 0.2, l);
    }

    return c;
}

void main() {
    vec2 o = uTexel;
    vec3 sum = tap(vUv) * 4.0;
    sum += tap(vUv + vec2(-o.x, -o.y));
    sum += tap(vUv + vec2(o.x, -o.y));
    sum += tap(vUv + vec2(-o.x, o.y));
    sum += tap(vUv + vec2(o.x, o.y));
    gl_FragColor = vec4(sum / 8.0, 1.0);
}
`;

/** Naik dua kali resolusi (dual Kawase, 8 sampel), ditambah tingkat di atasnya. */
export const UPSAMPLE_FRAGMENT = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tBase;
uniform vec2 uTexel;
uniform float uAddBase;
varying vec2 vUv;

void main() {
    vec2 o = uTexel;
    vec3 sum = texture2D(tInput, vUv + vec2(-2.0 * o.x, 0.0)).rgb;
    sum += texture2D(tInput, vUv + vec2(2.0 * o.x, 0.0)).rgb;
    sum += texture2D(tInput, vUv + vec2(0.0, -2.0 * o.y)).rgb;
    sum += texture2D(tInput, vUv + vec2(0.0, 2.0 * o.y)).rgb;
    sum += 2.0 * texture2D(tInput, vUv + vec2(-o.x, o.y)).rgb;
    sum += 2.0 * texture2D(tInput, vUv + vec2(o.x, o.y)).rgb;
    sum += 2.0 * texture2D(tInput, vUv + vec2(o.x, -o.y)).rgb;
    sum += 2.0 * texture2D(tInput, vUv + vec2(-o.x, -o.y)).rgb;
    vec3 c = sum / 12.0;

    if (uAddBase > 0.5) {
        c += texture2D(tBase, vUv).rgb;
    }

    gl_FragColor = vec4(c, 1.0);
}
`;

/**
 * Komposit akhir di resolusi layar:
 * 1. piksel tajam dari gambar dalam: nearest, atau sharp bilinear untuk skala
 *    pecahan (rumus sama dengan langkah a2);
 * 2. tepi kabur: DOF dari kedalaman (fokus di tengah toko) atau tilt-shift dari
 *    posisi layar, memakai dua tingkat blur (½ dan ¼) yang diambil linear;
 * 3. bloom bertingkat, kabut tipis menurut kedalaman, olah warna (kurva
 *    kontras, split-toning biru-jingga, saturasi, angkat hitam ke biru latar),
 *    vinyet, dan dither halus anti-belang.
 */
export const COMPOSITE_FRAGMENT = /* glsl */ `
#include <packing>

uniform sampler2D tScene;
uniform sampler2D tDepth;
uniform sampler2D tBloom;
uniform sampler2D tBlur1;
uniform sampler2D tBlur2;

uniform vec2 uSize;
uniform vec2 uScreen;
uniform float uScale;
uniform vec2 uFrac;
uniform float uMode;
uniform float uPrescale;

uniform float uNear;
uniform float uFar;
uniform float uOrtho;

uniform float uBloom;
uniform float uBlurMode;
uniform float uFocus;
uniform vec2 uDofRange;
uniform vec2 uTilt;

uniform float uFog;
uniform vec3 uFogColor;
uniform vec2 uFogRange;

uniform float uGrade;
uniform vec3 uLift;
uniform float uVignette;
uniform vec3 uVignetteColor;

${BAYER}

float sharpAxis(float p, float k) {
    float q = p * k;
    float j0 = floor(q - 0.5);
    float w = q - 0.5 - j0;
    float t0 = floor((j0 + 0.5) / k);
    float t1 = floor((j0 + 1.5) / k);

    return t0 == t1 ? t0 + 0.5 : t0 + 0.5 + w;
}

float viewDistance(float depth) {
    float z = uOrtho > 0.5
        ? orthographicDepthToViewZ(depth, uNear, uFar)
        : perspectiveDepthToViewZ(depth, uNear, uFar);

    return -z;
}

vec3 grade(vec3 linearColor) {
    vec3 c = pow(max(linearColor, 0.0), vec3(1.0 / 2.2));
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    // Split-toning: bayangan kebiruan, terang jingga keemasan.
    vec3 tint = mix(vec3(0.9, 0.97, 1.1), vec3(1.1, 0.99, 0.86), smoothstep(0.15, 0.75, l));
    c *= tint;
    // Kurva kontras S halus dan saturasi sedikit naik.
    c = clamp(c, 0.0, 1.0);
    c = mix(c, c * c * (3.0 - 2.0 * c), 0.35);
    float l2 = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l2), c, 1.08);
    // Hitam diangkat sedikit ke biru latar, supaya bayangan tidak mati.
    c = uLift + c * (1.0 - uLift);

    return pow(clamp(c, 0.0, 1.0), vec3(2.2));
}

void main() {
    vec2 p = gl_FragCoord.xy / uScale + 1.0 + uFrac;
    vec2 tSharp = uMode > 0.5
        ? vec2(sharpAxis(p.x, uPrescale), sharpAxis(p.y, uPrescale))
        : floor(p) + 0.5;
    vec3 color = texture2D(tScene, tSharp / uSize).rgb;
    float depth = texture2D(tDepth, (floor(p) + 0.5) / uSize).x;
    vec2 uvLinear = p / uSize;
    float dist = depth < 1.0 ? viewDistance(depth) : uFar;

    if (uBlurMode > 0.5) {
        float coc;

        if (uBlurMode < 1.5) {
            // DOF: jauh dari bidang fokus makin kabur, dibantu sedikit oleh posisi layar.
            coc = clamp((abs(dist - uFocus) - uDofRange.x) / uDofRange.y, 0.0, 1.0);
            float y = gl_FragCoord.y / uScreen.y;
            coc = max(coc, 0.5 * (smoothstep(uTilt.x, 0.0, y) + smoothstep(1.0 - uTilt.y, 1.0, y)));
        } else {
            // Tilt-shift: pita atas dan bawah layar.
            float y = gl_FragCoord.y / uScreen.y;
            coc = smoothstep(uTilt.x, 0.0, y) + smoothstep(1.0 - uTilt.y, 1.0, y);
        }

        coc = clamp(coc, 0.0, 1.0);
        vec3 b1 = texture2D(tBlur1, uvLinear).rgb;
        vec3 b2 = texture2D(tBlur2, uvLinear).rgb;
        vec3 blurred = mix(b1, b2, smoothstep(0.45, 1.0, coc));
        color = mix(color, blurred, smoothstep(0.05, 0.6, coc));
    }

    if (uBloom > 0.0) {
        color += texture2D(tBloom, uvLinear).rgb * uBloom;
    }

    if (uFog > 0.0 && depth < 1.0) {
        float f = clamp((dist - uFogRange.x) / (uFogRange.y - uFogRange.x), 0.0, 1.0);
        color = mix(color, uFogColor, f * uFog);
    }

    if (uGrade > 0.5) {
        color = grade(color);
    }

    if (uVignette > 0.0) {
        vec2 q = gl_FragCoord.xy / uScreen - 0.5;
        float v = smoothstep(0.32, 0.85, length(q * vec2(1.0, 0.9)));
        color = mix(color, uVignetteColor, v * uVignette);
    }

    // Dither halus (±½ langkah 8 bit) supaya gradasi gelap tidak belang.
    color += (bayer(gl_FragCoord.xy) - 0.5) / 255.0;

    gl_FragColor = vec4(max(color, 0.0), 1.0);
    #include <colorspace_fragment>
}
`;

// ---- Sprite karakter -------------------------------------------------------------

export const MAX_SPRITE_BOXES = 12;

export const SPRITE_VERTEX = /* glsl */ `
attribute float alpha;
attribute vec3 foot;
attribute vec3 lamp;
attribute vec4 frame;

varying vec2 vUv;
varying float vAlpha;
varying vec3 vFoot;
varying vec3 vLamp;
varying vec4 vFrame;

void main() {
    vUv = uv;
    vAlpha = alpha;
    vFoot = foot;
    vLamp = lamp;
    vFrame = frame;
    // Sudut sudah dalam NDC gambar dalam (kaki dibulatkan ke piksel, kedalaman titik pijak).
    gl_Position = vec4(position, 1.0);
}
`;

/**
 * Sprite karakter tanpa resample, diterangi cahaya adegan:
 * - posisi dunia tiap texel dihitung dari titik pijak (tegak di sana), lalu
 *   diuji terkena matahari: lewat atas dinding, lewat kaca jendela (bukan
 *   kusen), dan tidak terhalang kotak perabot (rumus sama dengan
 *   `sunVisible` di lighting-math.ts);
 * - irradiansi = ambien + lampu (dihitung per sprite di CPU) + matahari;
 * - rim keemasan 1 texel di sisi jendela: texel yang tetangganya ke arah
 *   matahari transparan;
 * - opsi garis luar gelap 1 texel di sekeliling karakter.
 * Warna gambar sumber tidak diubah; hanya dikalikan cahaya.
 */
export const SPRITE_FRAGMENT = /* glsl */ `
#include <common>

#define MAX_BOXES ${MAX_SPRITE_BOXES}
#define SUN_WRAP 0.55
#define LAMP_WRAP 0.6

uniform sampler2D map;
uniform vec2 uAtlas;
uniform float uLit;
uniform vec3 uAmbient;
uniform vec3 uSun;
uniform vec3 uToSun;
uniform vec4 uGlass;
uniform vec4 uMullionV;
uniform vec4 uMullionH;
uniform float uWallH;
uniform float uSceneW;
uniform vec3 uBoxMin[MAX_BOXES];
uniform vec3 uBoxMax[MAX_BOXES];
uniform int uBoxCount;
uniform float uTexelV;
uniform float uPx;
uniform vec3 uCamRight;
uniform float uRim;
uniform vec2 uRimDir;
uniform vec3 uRimColor;
uniform float uOutline;
uniform vec3 uOutlineColor;

varying vec2 vUv;
varying float vAlpha;
varying vec3 vFoot;
varying vec3 vLamp;
varying vec4 vFrame;

${BAYER}

bool inRect(vec2 q, vec4 r) {
    return q.x > r.x && q.x < r.y && q.y > r.z && q.y < r.w;
}

bool hitsBox(vec3 p, vec3 d, vec3 lo, vec3 hi) {
    vec3 inv = 1.0 / d;
    vec3 t1 = (lo - p) * inv;
    vec3 t2 = (hi - p) * inv;
    vec3 tmin = min(t1, t2);
    vec3 tmax = max(t1, t2);
    float a = max(max(tmin.x, tmin.y), max(tmin.z, 1e-4));
    float b = min(min(tmax.x, tmax.y), tmax.z);

    return a <= b;
}

float sunVisible(vec3 p) {
    float visible = 1.0;

    if (uToSun.z < 0.0 && p.z > 0.0) {
        float s = p.z / -uToSun.z;
        vec2 q = p.xy + uToSun.xy * s;
        bool onWall = q.x >= 0.0 && q.x <= uSceneW && q.y >= 0.0 && q.y < uWallH;
        bool throughGlass = inRect(q, uGlass) && !inRect(q, uMullionV) && !inRect(q, uMullionH);

        if (onWall && !throughGlass) {
            visible = 0.0;
        }
    }

    for (int i = 0; i < MAX_BOXES; i++) {
        if (i < uBoxCount && visible > 0.0 && hitsBox(p, uToSun, uBoxMin[i], uBoxMax[i])) {
            visible = 0.0;
        }
    }

    return visible;
}

void main() {
    vec2 texel = 1.0 / uAtlas;
    vec4 c = texture2D(map, vUv);

    if (vAlpha < 1.0 && bayer(gl_FragCoord.xy) >= vAlpha) {
        discard;
    }

    if (c.a < 0.5) {
        if (uOutline > 0.5) {
            float n = texture2D(map, vUv + vec2(texel.x, 0.0)).a
                + texture2D(map, vUv - vec2(texel.x, 0.0)).a
                + texture2D(map, vUv + vec2(0.0, texel.y)).a
                + texture2D(map, vUv - vec2(0.0, texel.y)).a;

            if (n > 0.5) {
                gl_FragColor = vec4(uOutlineColor, 1.0);
                #include <colorspace_fragment>
                return;
            }
        }

        discard;
    }

    vec3 color = c.rgb;

    if (uLit > 0.5 || uRim > 0.5) {
        // Posisi dunia texel ini: tegak di titik pijak.
        float rows = (vFrame.y - vUv.y) * uAtlas.y + vFrame.z;
        float cols = (vUv.x - vFrame.x) * uAtlas.x;
        vec3 world = vFoot + vec3(0.0, rows * uTexelV, 0.0) + uCamRight * (cols / uPx);
        float sun = sunVisible(world);

        if (uLit > 0.5) {
            vec3 irradiance = uAmbient + vLamp * LAMP_WRAP + uSun * (sun * SUN_WRAP);
            color = c.rgb * irradiance * RECIPROCAL_PI;
        }

        if (uRim > 0.5) {
            vec2 side = vec2(uRimDir.x * texel.x, -uRimDir.y * texel.y);

            if (texture2D(map, vUv + side).a < 0.5) {
                color += uRimColor * (0.12 + 0.88 * sun);
            }
        }
    }

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
}
`;

// ---- Berkas sinar, debu, halo ------------------------------------------------------

export const BEAM_VERTEX = /* glsl */ `
attribute float along;
attribute float across;

varying float vAlong;
varying float vAcross;
varying vec3 vWorld;

void main() {
    vAlong = along;
    vAcross = across;
    vWorld = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Berkas sinar di udara: terang di dekat kaca, memudar ke lantai, tepi lembut
 * di rusuk prisma, berkilau pelan. Dicampur aditif (hanya mencerahkan).
 */
export const BEAM_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;

varying float vAlong;
varying float vAcross;
varying vec3 vWorld;

void main() {
    float edge = pow(sin(3.14159265 * clamp(vAcross, 0.0, 1.0)), 0.7);
    float fade = pow(1.0 - clamp(vAlong, 0.0, 1.0), 1.3) * smoothstep(0.0, 0.05, vAlong);
    float shimmer = 0.88 + 0.12 * sin(uTime * 0.6 + vWorld.x * 3.0 + vWorld.y * 5.0);
    float a = uIntensity * edge * (0.25 + 0.75 * fade) * shimmer;
    gl_FragColor = vec4(uColor * a, 1.0);
    #include <colorspace_fragment>
}
`;

export const DUST_VERTEX = /* glsl */ `
attribute vec4 params;

uniform vec3 uTopLeft;
uniform vec3 uTopRight;
uniform vec3 uBottomLeft;
uniform vec3 uToSun;
uniform float uTime;
uniform float uSize;

varying float vTwinkle;

void main() {
    // Titik di kaca (u, v), lalu digeser sepanjang berkas ke arah lantai (t).
    vec3 w = uBottomLeft + (uTopRight - uTopLeft) * params.x + (uTopLeft - uBottomLeft) * params.y;
    float span = w.y / uToSun.y;
    float t = fract(params.z + uTime * 0.012 * (0.6 + params.w / 6.2831853));
    vec3 p = w - uToSun * span * t;
    p += vec3(
        sin(uTime * 0.5 + params.w) * 0.04,
        sin(uTime * 0.37 + params.w * 1.7) * 0.03,
        cos(uTime * 0.43 + params.w) * 0.04
    );
    vTwinkle = 0.5 + 0.5 * sin(uTime * (1.1 + params.w * 0.25) + params.w * 7.0);
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
    gl_PointSize = params.w > 5.2 ? uSize * 2.0 : uSize;
}
`;

export const DUST_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vTwinkle;

void main() {
    float a = vTwinkle * vTwinkle;

    if (a < 0.08) {
        discard;
    }

    gl_FragColor = vec4(uColor * a, 1.0);
    #include <colorspace_fragment>
}
`;

export const HALO_VERTEX = /* glsl */ `
uniform float uSize;

void main() {
    gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize;
}
`;

/** Halo lampu: lingkaran bertingkat 4 langkah (tetap terasa pixel), aditif. */
export const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uColor;

void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = floor(pow(max(0.0, 1.0 - r), 2.0) * 4.0) / 4.0;

    if (a <= 0.0) {
        discard;
    }

    gl_FragColor = vec4(uColor * a, 1.0);
    #include <colorspace_fragment>
}
`;
