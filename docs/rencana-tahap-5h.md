# Tahap 5H: Diorama 3D bergaya HD-2D dengan three.js (rencana)

> **Digantikan (27 Nov 2026).** Atas keputusan pemilik, arah ini diganti konsep "toko item fantasi malam" dengan aset Higgsfield (cabang `feature/hd2d-ui`).
> - Langkah a1 dan a2 selesai.
> - Langkah a3 di-commit sebagai WIP.
> - Langkah b–d dibatalkan.
>
> Bagian kode 5H (pipa cahaya, bayangan sprite, debu, HUD, penjaga performa, dispose) boleh dipakai ulang. Rincian di PROGRESS.md.

## Persetujuan pemilik (26 Nov 2026)

- **Rencana disetujui.** Simpan rencana ini ke `docs/rencana-tahap-5h.md`.
- **Perbaiki `PROGRESS.md`:** 5F dan 5G sudah di-push.
- **Paket:** `three` + `@types/three` boleh dipasang, dengan versi pasti yang rilis minimal 2 minggu sebelumnya. Versi dan alasannya dilaporkan sebelum memasang.
- **Tag dan cabang:**
  - buat tag beranotasi `versi-aman-canvas` di `main` dan cabang `tahap-5h-diorama-3d`;
  - **tag jangan di-push** sebelum pemilik memastikan repo GitHub privat.
- **`prefers-reduced-motion`** (geser kamera dan debu mati): disetujui, dikerjakan di langkah yang sesuai.
- **Sesi ini hanya langkah a1:**
  - `/diorama-3d-lab` (hanya admin);
  - `DioramaView` + `WebGLView` dasar;
  - resolusi dalam dan skala bulat;
  - kamera dengan geser kursor;
  - palet dunia, generator tekstur procedural, dan atlas;
  - balok toko: alas bata, lantai papan, dua dinding;
  - lembar tekstur 4×;
  - **tanpa efek cahaya.**
- **Jangan menyentuh** Beranda, `DioramaCanvas`, atau `/diorama-lab.`
- **Penutup:**
  - perlihatkan di browser dan tunggu persetujuan sebelum a2;
  - commit hanya setelah disetujui (tanpa Co-Authored-By);
  - tes memakai `kasir_test`;
  - perbarui `PROGRESS.md` dengan rekomendasi untuk a2.

### Persetujuan langkah a1 (26 Nov 2026)

- Langkah a1 disetujui dan di-commit di cabang `tahap-5h-diorama-3d`. Tag `versi-aman-canvas` tetap belum di-push.
- **Kemiringan bawaan 30°** disetujui.
- **Lantai 16 texel per ubin** (bukan 48) disetujui.
- Alasannya dicatat di bagian 1 ("Ruang dunia dan kepadatan texel") dan bagian 2 ("Pixel tetap tajam").

## Konteks

Pemilik ingin diorama Beranda naik kelas: **sprite pixel tajam di dunia 3D yang berlampu**, terinspirasi JRPG HD-2D. Suasana utamanya sore hangat dengan sinar dari jendela, bayangan panjang, debu berkilau, bloom halus, dan tepi kabur.

Semua gambar tetap dibuat dari kode. Targetnya jujur: **atmosferik dan terinspirasi, bukan setara game profesional**.

Diorama Canvas sekarang (5F + 5G) **tetap ada sebagai cadangan otomatis**. Perilaku tidak berubah:
- denah toko;
- logika jalan, antrean, dan state machine aktor;
- data nyata (DioramaFeed, polling 5 detik);
- klik pelanggan;
- tombol pos dan karakter besar;
- kartu "Hari Ini", menu, bunyi, dan hak akses.

`docs/referensi-antarmuka/hd2d-acuan.png` hanya acuan suasana. Gambar itu tangkapan layar game komersial, jadi tidak ada aset, bentuk, atau tata letak yang disalin.

## 0. Status rencana lama dan nama tahap

- **Rencana "Tahap 5F: diorama 2.5D bergaya HD-2D di Canvas": selesai seluruhnya.**
  - Ketiga langkahnya (balok melayang, kedalaman, cahaya + bloom + tilt-shift) di-commit `e7ace4c`.
  - Konsep v4 "cozy elegan" (Tahap 5G, `2f169ba`) dibangun di atasnya. Keduanya sudah di GitHub.
  - Yang masih terbuka hanya pengukuran FPS di browser pemilik.
  - Catatan: PROGRESS.md masih menulis "belum di-push"; itu sudah tidak benar.
- **Rencana baru tidak membatalkan 5F/5G; ia menggantikannya sebagai tampilan utama** di perangkat yang mampu WebGL2.
  - 5F/5G menjadi cadangan Canvas yang tetap dirawat.
  - Bloom CSS, tilt-shift CSS, dan rona hangat 5F/5G hanya berlaku di mode Canvas.
- **Nama tahap:** "Tahap 5G" sudah dipakai (commit `2f169ba`, PROGRESS), jadi **usul nama Tahap 5H**. Bila pemilik ingin nama lain, cukup diganti.

## 1. Arsitektur

### Logika dipakai ulang, renderer dipisah

Pemisahannya sudah ada:
- `DioramaWorld` (`diorama/engine/world.ts`) memegang semua logika: aktor, antrean, peristiwa, dan isi rak (`shelves.ts`);
- `PlaceholderRenderer` (`render/placeholder-renderer.ts`) hanya menggambar;
- `DioramaCanvas` (`components/diorama/diorama-canvas.tsx`) menjalankan loop 30 FPS (`engine/loop.ts`) dan meneruskan `onFrame` (bunyi).

Rencana ini menambah satu antarmuka di antara keduanya:

```
DioramaFeed ──► DioramaWorld (tidak berubah)
                   │ world.update(dt)  ◄── loop 30 FPS yang ada (startLoop)
                   ▼
            DioramaView  (antarmuka baru, diorama/view/types.ts)
             ├─ CanvasView  → PlaceholderRenderer yang ada (cadangan, perilaku sama)
             └─ WebGLView   → diorama/three/*   (dimuat lewat import() dinamis)
                                └─ AtlasRegistry ◄── AssetSource[] (procedural / paket berlisensi)
```

```ts
interface DioramaView {
  kind: 'canvas' | 'webgl';
  attach(host: HTMLElement): void;
  resize(cssW: number, cssH: number, dpr: number): void;
  render(world: DioramaWorld, options: RenderOptions, dt: number): void; // RenderOptions yang ada
  toScreen(a: WorldAnchor): Point | null;  // px CSS relatif host, untuk tombol dan kartu
  pick(p: Point): Customer | null;         // klik pelanggan
  onLost(cb: () => void): void;            // konteks WebGL hilang → pindah ke Canvas
  dispose(): void;
}
type WorldAnchor = { gx: number; gy: number; z: number }; // ubin (boleh pecahan) + tinggi
```

**Komponen baru `DioramaStage`** menggantikan `DioramaCanvas` di Beranda pada langkah (c). Isinya:
- loop yang sama, `onFrame` yang sama;
- lapisan tombol (overlay) yang sama;
- pemilihan backend.

`DioramaCanvas` dan `/diorama-lab` tidak disentuh. **Diorama tetap hanya membaca:** tidak ada data yang ditulis.

### Ruang dunia dan kepadatan texel (diputuskan setelah a1)

Semua angka ada di `resources/js/diorama/three/space.ts`, satu-satunya sumber ukuran dunia 3D:

| Ukuran | Nilai | Arti |
| --- | --- | --- |
| Satuan dunia | 1 satuan = 1 ubin denah | gx → x, gy → z, tinggi → y, lantai di y = 0 |
| `PX_PER_UNIT` | 64 / √2 ≈ **45,25 piksel dalam per ubin** | Diagonal ubin 64 px, sama persis dengan ubin iso 64 × 32 di Canvas |
| `TEXELS_PER_TILE` | **16 texel per ubin** | Lantai dan arah sepanjang dinding |
| `TEXEL_V` | 1 / (45,25 × cos 30°) | Arah tegak: **1 texel = 1 piksel**, jadi dinding 80 texel dan alas 23 texel setinggi 80 dan 23 piksel seperti Canvas |
| Sprite menghadap kamera (karakter, a2) | 1 piksel gambar = 1 piksel dalam | Sama dengan 45,25 piksel per ubin di bidang fokus |

**Alasan 16 texel per ubin (bukan 48 seperti rencana awal):**
- Pada kemiringan 30° dan arah 45°, satu ubin tampil sebagai belah ketupat 64 × 32 piksel dalam. Satu sisinya 32 piksel ke samping dan 16 piksel ke bawah.
- Dengan 16 texel per sisi, **tiap texel lantai menjadi tangga tepat 2 × 1 piksel**, sama dengan garis iso pixel art di Canvas.
- Dengan 48 texel, satu texel lebih kecil dari satu piksel. Texel akan terlewat dan berkilau saat kamera bergeser.
- Dicek di lab langkah a1 pada perbesaran 4×.

Kepadatan ini hanya mengatur tekstur lingkungan. Atlas tidak menyimpan angka kepadatan; geometri (`three/build-store.ts`) yang memetakan texel ke satuan dunia dengan angka di atas.

### Pemilihan otomatis dan cadangan

Pemilihan memakai fungsi murni `chooseBackend(...)` yang dites Vitest:

1. **Paksaan lewat alamat:** `?render=canvas|3d` (seperti `?waktu=` yang ada), untuk demo dan pembandingan.
2. **Kemampuan perangkat:**
   - konteks **WebGL2** bisa dibuat;
   - tidak memakai renderer perangkat lunak (`failIfMajorPerformanceCaveat`, mis. SwiftShader);
   - `MAX_TEXTURE_SIZE ≥ 2048`.
   - Bila salah satu gagal → Canvas. (three.js terbaru tidak lagi mendukung WebGL1.)
3. **Ingatan per perangkat:** localStorage, dibungkus try/catch. Bila sebelumnya diturunkan karena lambat, perangkat itu memakai Canvas selama 7 hari.
4. **Saat berjalan:**
   - penjaga performa (bagian 5) menurunkan kualitas bertahap; bila tingkat terendah tetap lambat → pindah ke Canvas;
   - `webglcontextlost`, atau `import()` three gagal dimuat → Canvas seketika.

**Perpindahan mulus:** dunia yang sama dipakai terus, hanya view yang diganti. Pelanggan yang sedang antre tidak hilang.

### Lapisan atlas (agar aset bisa diganti)

Bentuknya sesuai yang dibuat di a1 (`resources/js/diorama/assets/atlas.ts`):

```ts
type AtlasFrame  = { x: number; y: number; w: number; h: number; pivot: { x: number; y: number } };
type AtlasLayout = { width: number; height: number; padding: number; frames: Record<string, AtlasFrame> };
type AtlasPack   = { source: string; image: TexImageSource; layout: AtlasLayout };
interface AssetSource { id: string; load(): Promise<AtlasPack> }
```

- **Renderer hanya memanggil kunci semantik yang tetap.** Contoh:
  - `tex/floor/walnut#3`, `tex/wall/plaster-mawar#1`, `tex/base/bata#2`;
  - `sprite/char/zombie/seret/2`, `sprite/char/ninja/jalan/1`;
  - `prop/tanaman/1`, `prop/barang/<warna>`.
- **`ProceduralSource`** membuat semua kunci dari kode saat mulai (matriks piksel → dikemas ke kanvas atlas).
- **`ManifestSource`** (nanti) membaca PNG + JSON atlas dari paket berlisensi (format umum TexturePacker atau Aseprite), lewat berkas pemetaan "nama bingkai mereka → kunci kita".
- **`AtlasRegistry`** menggabungkan sumber berurutan prioritas. Kunci yang tidak ada di paket jatuh ke procedural.
- **Aturan teknis atlas:**
  - tekstur `NearestFilter` tanpa mipmap;
  - tiap bingkai diberi padding 2 texel berulang tepi (tanpa rembes);
  - permukaan berulang (lantai, dinding) dibuat dari kotak per ubin yang menunjuk varian di atlas, sehingga tidak perlu wrap tekstur.
- **Tes:** kelengkapan kunci (semua kunci yang dibutuhkan renderer ada), atlas tanpa tumpang tindih, dan hasil yang sama untuk seed yang sama.

## 2. Gaya visual

### Pixel tetap tajam

- **Resolusi dalam:**
  - adegan dirender ke target kecil, lalu diperbesar tanpa penghalusan (sampel nearest);
  - **skala 45,25 piksel dalam per ubin, lantai 16 texel per ubin** (keputusan setelah a1; lihat bagian 1 "Ruang dunia dan kepadatan texel");
  - ukuran piksel di layar sama dengan diorama Canvas sekarang;
  - **aturan skala tampilan** (`viewportFor`):
    - kelipatan bulat bila tidak mengecilkan balok lebih dari 20% dibanding skala yang pas;
    - selain itu pecahan, seperti Canvas;
  - **hasil yang dicek di a1:**
    - 1920 × 1080 fisik (skala Windows 125%) → **×2 bulat**, gambar dalam 960 × 540;
    - 1366 × 768 → pecahan sekitar 1,6, karena ×1 membuat toko terlalu kecil.
- **Kamera:**
  - **kemiringan tetap 30° (disetujui pemilik setelah a1)**, arah 45° (dua dinding belakang terlihat, sama dengan denah iso sekarang);
  - **alasan 30°:**
    - hanya pada 30° satu ubin menjadi belah ketupat 2:1 (64 × 32), sehingga texel lantai jatuh tepat sebagai tangga 2 × 1 piksel;
    - pada **35° dan 40°** tinggi belah ketupat bukan lagi setengah lebarnya, sehingga **tangga texel tidak rata** (langkah 1 dan 2 piksel bercampur) dan garis papan tampak bergerigi;
    - dibandingkan langsung di lab a1, dan pilihan 35°/40° tetap ada di lab untuk pembanding;
  - **sudut pandang sempit, 10° vertikal** (lensa panjang). Ukuran texel depan dan belakang hanya sedikit berbeda, sehingga pixel tidak "berenang";
  - lensa ortografik tersedia di lab sebagai pembanding; pilihan akhir lensa diputuskan setelah ada cahaya (a3);
  - **titik fokus kamera di kedalaman tengah balok**, sehingga skala di sana tepat 45,25 piksel per ubin. Diperbaiki di a1: bila fokus di bidang pojok belakang, balok tampil ±13% lebih besar.
- **Geser halus mengikuti kursor:**
  - hanya **geser sejajar layar**, tanpa putar, sekitar ±0,15 ubin, dengan pegas teredam ±0,6 detik;
  - kamera dibulatkan ke grid texel, dan sisa pecahannya diterapkan sebagai geseran UV halus di komposit akhir (teknik kamera pixel-perfect: gambar tidak bergetar, gerak tetap mulus);
  - mati di layar sentuh, dan kembali ke tengah saat kursor keluar.
- **Sprite:**
  - posisi titik pijak dibulatkan ke piksel dalam;
  - `alphaTest` 0,5 (tepi tegas, tanpa piksel setengah transparan).

### Cara perabot dan sprite dibuat

- **Bangunan dan perabot = kotak sederhana bertekstur pixel procedural** (cara HD-2D). Semua posisi dan ukuran dari `STORE_SCENE` (`scenes/store-scene.ts`, tidak berubah):
  - balok toko: alas bata tebal + lantai papan;
  - dinding belakang kiri dan kanan dengan wainscot;
  - rak (badan + papan);
  - meja kasir (badan + permukaan marmer);
  - kulkas;
  - bangku.

  Tinggi diambil dari `height` px yang ada: 1 px tegak = 1 texel tegak (`TEXEL_V`), jadi tingginya sama dengan di Canvas.
- **Benda kecil = kartu tegak atau billboard dari atlas.** Termasuk tanaman, barang di rak (jumlah tetap dari `shelfFills`), kantong, koin, lampu dinding, jam, lukisan, layar total di meja, dan laser scanner.
- **Yang dipakai ulang langsung:** matriks yang **menghadap depan**:
  - karakter pemilik dan bingkai geraknya (`reference-sprite.ts`: `motionFrame`, `transformFrame`, `cashierMotion`, `referenceFlip`);
  - pelanggan buatan kode (`customer-sprite.ts` `frameAt`);
  - koin.
- **Yang dibuat ulang:** sprite ruangan, rak, meja, kulkas, dan barang lama digambar dalam proyeksi iso (`isoBox`), jadi tidak bisa jadi tekstur 3D. Warnanya diambil dari palet bahan v4 yang sudah disetujui (walnut, kuningan, marmer, mawar, ivory).

### Karakter dari gambar pemilik: cara mengolahnya (tanpa menggambar ulang)

1. **Sumber sama:** PNG dan pemuat yang ada (`reference-loader.ts`), gerak "cara 1" yang ada. Gambar tidak diubah, tidak dipetakan ke palet, dan tidak di-resample.
2. **Kepadatan serasi:** 1 piksel karakter = 1 piksel dalam di bidang fokus (45,25 piksel per ubin, sama dengan Canvas). Proporsi karakter terhadap ubin sama dengan diorama sekarang.
3. **Atlas karakter:**
   - semua bingkai (9 karakter × aksi × frame × cermin, sekitar 150–200 bingkai) dipra-render sekali ke atlas 1024² (NearestFilter);
   - pelanggan buatan kode (giliran ke-8, `customerCharacter`) juga masuk.
4. **Billboard:**
   - quad selalu menghadap kamera (tidak gepeng);
   - kedalaman dihitung seolah karakter berdiri tegak di titik pijaknya (di vertex shader), sehingga tidak menembus rak di belakangnya;
   - cermin kiri/kanan dan sisi depan/belakang memakai `headingOf` dan `referenceFlip` yang ada.
5. **Penyerasian lewat cahaya, bukan lewat gambar:**
   - **pencahayaan sprite:** dicahayai cahaya adegan (lebih gelap di bayangan rak, menghangat saat masuk sinar jendela);
   - **garis tepi cahaya (rim):** 1 texel keemasan di sisi jendela, dihitung shader dari alfa tetangga;
   - **bayangan:**
     - bayangan kontak elips di kaki;
     - **bayangan panjang** dari quad tak terlihat yang menghadap matahari (khusus penghasil bayangan);
   - **olah warna:** akhir yang sama untuk semua isi adegan.
   - **Garis luar gelap 1 texel:** opsi, diputuskan di prototipe bila karakter tenggelam di tekstur.
6. **Karakter besar di dialog pos** tetap potret DOM yang sama, tidak berubah.

### Generator tekstur procedural

- **Letak:** `diorama/assets/procedural/`, fungsi murni berbenih, memakai `createRng` (`engine/rng.ts`) dan tipe `PixelMatrix` (`sprites/pixels.ts`). Hasilnya hanya warna palet dunia.
- **Pembantu:**
  - `noise.ts`: value noise 1D/2D berbenih;
  - `dither.ts`: Bayer 4×4 di antara dua nada.
- **Generator:**
  - `brick` (alas balok);
  - `wood` (papan lantai, badan perabot walnut);
  - `plaster` (dinding mawar dan ivory);
  - `wainscot`, `marble`, `brass`, `glass`;
  - `leaf` + `pot`.
- **Urutan untuk bata:**
  1. susunan ikatan berselang;
  2. nada dasar per bata, dipilih acak dari tangga 3 nada;
  3. derau per piksel menggeser ±1 nada pada 10–15% piksel;
  4. tepi atas sorot, tepi bawah bayang, sudut gempil acak;
  5. nat dua nada dengan dither;
  6. gradasi kotor ke arah bawah dengan dither Bayer.
- **Variasi per ubin** (sesuai yang dibuat di a1):
  - lantai satu tekstur utuh 192 × 144 texel (12 × 9 ubin × 16), sehingga papan menyambung lintas ubin tanpa pola berulang;
  - kecerahan ±3% per ubin lewat warna vertex;
  - **bayangan per ubin:** oklusi di kaki dinding dan tapak perabot dipanggang ke warna vertex sekali saat mulai (gagasan yang sama dengan `render/depth.ts` 5F).

**Contoh tampilan** (perkiraan bentuk; 1 karakter = 1 texel; versi warna 4× diperlihatkan di lab langkah a1):

```
Bata 16×8           Papan walnut 16×8     Daun 16×8             Legenda
================    ^^^^^^^^^^^|^^^^^^    ...LL*...ML.....      = nat      ^ sorotan tepi
^^^^^^^=^^^^^^^=    aa-aaaa--aa|abaaa     ..LMML..MMLL....      a b c nada bahan (terang→gelap)
abaacab=baab:ab=    a--aaoa-aaa|a--aa     .DMMMLLDMMMML...      : dither   _ bayangan tepi
__:____=_______=    ___________|_____     .DDMMMMDDMMMLL..      - serat    o mata kayu
================    ^^^^|^^^^^^^^^^^^     ..DDMDDDDMMMD...      | sambungan ujung papan
^^^=^^^^^^^=^^^^    bab-|aa--aaaa-ab      ...DD..DDDD.....      L M D daun terang/sedang/gelap
bca=aab:aab=caab    b--a|aaaoa--aab                             * kilau   . transparan
___=_______=____    ____|____________
```

### Palet dunia dan dampaknya pada tes

- **Palet antarmuka 24 warna** (`sprites/palette.ts` `PALETTE`, token `px-*`): **tidak berubah**.
- **Berkas baru `diorama/three/palette-world.ts`**, sekitar 55 warna (dalam rentang 48–64):

| Kelompok | Jumlah |
| --- | --- |
| Latar biru gelap dan tinta bayangan | 5 |
| Bata alas | 6 |
| Walnut (dari `MATERIAL`) | 7 |
| Plester mawar, ivory, wainscot, panel | 8 |
| Kuningan | 3 |
| Marmer | 3 |
| Daun dan pot terakota | 8 |
| Kaca dan enamel kulkas | 4 |
| Barang rak (dari `MATERIAL`) | 6 |
| Cahaya: emas matahari, oranye senja, lampu hangat, inti lampu, bara | 5 |

- Palet dunia hanya untuk **tekstur sumber** lingkungan. Karakter pemilik tetap berwarna asli; pelanggan buatan kode dan barang tetap palet 24.
- **Tes lama tidak berubah**, karena sprite Canvas tetap ada:
  - `isPaletteColor`: ikon antarmuka, karakter, barang, hiasan;
  - `isSceneColor`: ruangan dan perabot Canvas.
- **Tes baru:**
  - palet dunia 48–64 warna dan tanpa duplikat;
  - semua keluaran generator ⊂ palet dunia;
  - penjaga bahwa `PALETTE` tetap 24 warna yang sama;
  - palet dunia tidak dipakai di komponen antarmuka.

## 3. Pencahayaan dan kedalaman (yang termurah, semuanya dari `three`)

| Bagian | Cara | Biaya |
| --- | --- | --- |
| Sinar utama | `DirectionalLight` oranye rendah (±18°) masuk lewat jendela; bayangan `shadowMap` 1024² PCF, frustum dipersempit ke balok toko → bayangan panjang perabot dan karakter | 1 pass bayangan |
| Berkas sinar | Selubung jendela yang diekstrusi searah matahari, shader aditif bergradasi + derau pelan, pudar oleh kedalaman (bukan volumetrik raymarch) | 1 draw |
| Debu berkilau | `Points` ±200 partikel di dalam berkas saja, aditif, berkilau hanya di dalam sinar, melayang pelan | 1 draw |
| Lampu hangat | 2–3 `PointLight` tanpa bayangan + halo billboard untuk bloom; layar dan kaca memakai `emissive` | per piksel, murah di resolusi dalam |
| Cahaya ambien | `HemisphereLight` (langit sejuk, lantai hangat) + oklusi yang dipanggang ke warna vertex | gratis |
| Bloom | Bright-pass + rantai turun ½ ¼ ⅛ dengan blur terpisah, dari resolusi dalam | ±4 pass kecil |
| Tepi kabur | DOF dari tekstur kedalaman (fokus di tengah toko, sedikit dibantu posisi layar), memakai rantai blur yang sama; cadangan: tilt-shift murni | 0 pass tambahan |
| Kabut tipis | `Fog` bawaan material + kabut kedalaman tipis di komposit | gratis |
| Olah warna | Di komposit akhir: kurva kontras, split-toning (bayangan kebiruan, terang jingga), saturasi, vinyet, latar biru gelap, dither 1-bit anti-belang | 1 pass layar penuh |

- **Pipa render:**
  1. adegan → target resolusi dalam (+ tekstur kedalaman);
  2. pass kecil bloom dan blur;
  3. **satu komposit di resolusi layar:** piksel tajam diambil nearest, piksel kabur diambil linear, lalu dicampur menurut jarak fokus.

  Hasilnya: bagian dalam fokus tajam berpiksel, yang kabur tetap lembut.
- **Paket tambahan: tidak ada.**
  - Shader ditulis sendiri dengan `WebGLRenderTarget` + `ShaderMaterial` dari `three`.
  - Tidak memakai `postprocessing` (pmndrs), `@react-three/fiber`/`drei`, `stats.js`, atau `lil-gui`, karena loop kita imperatif dan HUD serta kontrol lab dibuat sendiri.

## 4. Interaksi

- **Jangkar di ruang dunia:**
  - fungsi murni baru `postAnchorTile(scene, post)` di samping `postAnchor` (`engine/posts.ts`): pojok depan meja pos + jarak, di ketinggian lantai;
  - kepala pelanggan: `{fx, fy, z: tinggi badan}`;
  - Canvas tetap memakai `postAnchor` dan `customerHead` yang ada.
- **Proyeksi ke layar:**
  - `view.toScreen(anchor)` memakai kamera three;
  - setiap bingkai posisi `PostButton`, `PostNotice`, dan `CustomerCard` ditulis lewat ref (`transform`), tanpa render ulang React, sehingga tombol ikut geser kamera dengan halus;
  - komponen-komponen itu diubah agar menerima titik layar jadi, bukan `anchor + scale`;
  - tombol tetap tombol HTML biasa (keyboard, Tab, Enter, Esc sama), di atas kanvas, tidak ikut buram.
- **Klik dan hover pelanggan:**
  - kotak tiap pelanggan diproyeksikan (titik pijak ke kepala, selebar `HIT_BOX`) ke layar;
  - yang paling dekat kamera dipilih (fungsi murni `pickProjected`);
  - kartu tetap di atas kepala saat diklik, sama seperti sekarang;
  - tanpa raycaster.
- **Panel karakter besar dan penolakan pos:** tidak berubah (`PostPanel`, `usePostAccess`, Gate di server).
- **Cara menguji:**
  - **Vitest di Node:** matematika kamera three berjalan tanpa WebGL. Diuji:
    - proyeksi jangkar pos jatuh di depan meja dan di dalam layar;
    - `pickProjected` memilih yang terdepan dan meleset di lantai kosong;
    - pembulatan grid kamera;
    - `chooseBackend`;
    - penjaga performa.
  - **Browser:** di 1093×614, 1366×768, 1920×1080, dan lebar HP:
    - klik tiap pelanggan saat kamera bergeser;
    - Tab ke tombol pos lalu Enter;
    - login kasir → Inventaris ditolak dengan pesan;
    - `?render=canvas` tetap sama seperti sekarang.

## 5. Anggaran performa

- **Sasaran:**
  - tetap dibatasi **30 FPS** (aturan `claude.md`, `startLoop` yang ada);
  - di laptop **grafis terpadu** (Intel UHD 620/Iris Xe, AMD Vega 8) pada 1366×768 dan 1920×1080: **p90 waktu bingkai ≤ 20 ms**, batas keras 33 ms;
  - bingkai pertama ≤ 1,5 detik setelah halaman tampil.
- **Batas:**

| Ukuran | Batas |
| --- | --- |
| Draw call | ≤ 100 (geometri statis digabung per bahan) |
| Segitiga | ≤ 30 rb |
| Memori GPU (atlas 2×1024², target render, peta bayangan) | ≤ 40 MB |
| Potongan JS three (dimuat malas, hanya Beranda dan lab) | ≤ 200 KB gzip |

- **Penjaga performa:**
  - **tingkat 0–3**, diturunkan berurutan:
    - peta bayangan 1024 → 512;
    - debu mati;
    - DOF → tilt-shift;
    - bloom 3 → 2 tingkat;
    - skala bulat naik satu (piksel lebih besar, gaya tetap pixel);
  - **turun** bila p90 > 28 ms selama 3 detik; **naik** bila < 14 ms selama 10 detik; paling cepat satu langkah per 5 detik;
  - tingkat 3 tetap > 33 ms selama 5 detik → Canvas.
- **Jeda:**
  - loop yang ada sudah berhenti saat tab tersembunyi;
  - ditambah jeda saat diorama tidak terlihat (`IntersectionObserver`), dan 15 FPS saat panel pos terbuka (diorama diredupkan).
- **Pembuangan memori:**
  - saat unmount: semua geometri, material, tekstur, target render, `renderer.dispose()`, `forceContextLoss()`, kanvas dilepas;
  - syarat: `renderer.info.memory` kembali 0, dan heap JS stabil setelah tombol lab "pasang/lepas 20×";
  - saat berjalan: ≤ 60 geometri dan ≤ 12 tekstur hidup.
- **Cara mengukur:**
  - **HUD** `?hud=1`: FPS, p50/p90 ms, waktu GPU (`EXT_disjoint_timer_query_webgl2` bila ada), draw call, segitiga, resolusi dalam, tingkat, dan backend;
  - **DevTools Performance:** rekaman 10 detik, oleh pemilik;
  - **paksa grafis terpadu:** Windows → Pengaturan → Layar → Grafis → browser → Hemat daya. Penting, karena laptop pemilik kemungkinan punya kartu grafis khusus;
  - panel pratinjau Claude diperlambat browser (terbukti di 5F), jadi angka resminya dari pemilik;
  - pemeriksa three.js di sesi (threejs-devtools) dipakai untuk memeriksa draw call dan kebocoran memori. Spector saat ini gagal tersambung.

## 6. Tahapan kerja (tiap langkah ditunjukkan di browser dan menunggu persetujuan)

**Persiapan, di awal a1:**
1. tag `versi-aman-canvas` pada `main` sekarang (`fa52982`);
2. cabang `tahap-5h-diorama-3d`;
3. izin terpisah untuk memasang **`three`** (dependencies) dan **`@types/three`** (devDependencies), versi pasti yang rilis ≥ 2 minggu sebelum dipasang.

**Jumlah sesi dan model:**

| Langkah | Isi | Sesi | Model / upaya |
| --- | --- | --- | --- |
| **a1** | `/diorama-3d-lab` (hanya admin, seperti `/diorama-lab`), `DioramaView` + `WebGLView` dasar, resolusi dalam + skala bulat, kamera + geser kursor, palet dunia, generator tekstur, atlas, balok toko (alas bata, lantai papan, dua dinding + wainscot), lembar tekstur 4×. Belum ada efek cahaya | 1 | Opus, tinggi |
| **a2** | Beberapa perabot (1 rak berisi barang, meja kasir + zombie diam, kulkas, tanaman), **satu pelanggan** berjalan dari logika `DioramaWorld` yang ada, satu lampu dinding | 1 | Opus, tinggi |
| **a3** | Seluruh rantai cahaya sore (bagian 3) + HUD + penjaga performa; sakelar per efek dan tombol "bandingkan dengan Canvas" di lab; penilaian dengan daftar cek (bagian 7) | 1 | Opus, tinggi |
| **b** | Toko lengkap sesuai denah (dua rak dengan isi menurut stok, tiga kulkas, dua meja + layar total + laser scanner, pintu, hiasan dinding), **semua karakter** (7 pelanggan pemilik + buatan kode, zombie, gurita), kantong, koin, kejar-kejaran, bayangan karakter; dinilai per elemen | 2–3 | Sonnet, tinggi (Opus untuk shader yang macet) |
| **c** | Pasang ke Beranda: `DioramaStage`, `chooseBackend`, cadangan Canvas + perpindahan saat jalan, tombol pos dan kartu lewat proyeksi, klik pelanggan, bunyi, data feed, pembuangan memori; dicoba sebagai admin, kasir, bendahara | 1–2 | Sonnet, tinggi |
| **d** | Siang dan malam (sinar, lampu, kolam cahaya malam, jendela), bila waktu cukup | 1 | Sonnet, sedang |

**Jumlah: sekitar 7–9 sesi.** Satu langkah per sesi. Setelah tiap langkah, PROGRESS.md ditulis, lalu commit (tanpa baris Co-Authored-By) setelah disetujui. Push hanya bila disetujui. **Merge ke `main` hanya setelah (c) disetujui.**

## 7. Kriteria penilaian prototipe (dipakai setelah a3)

Dinilai di 1366×768 dan 1920×1080, sisi-sisian dengan Canvas (`?render=canvas`), memakai grafis terpadu.

| No | Aspek | Lulus bila |
| --- | --- | --- |
| 1 | Ketajaman pixel | Di area fokus tiap texel bertepi tegas saat diperbesar. Ukuran texel seragam (karakter = dunia ±10%). Tidak ada kilau atau "berenang" selama 10 detik kursor digeser dan pelanggan berjalan. Tidak ada garis rembes di sambungan tekstur |
| 2 | Kedalaman | Balok terbaca tebal dan melayang. Depan dan belakang lembut, tengah tajam. Perabot dan kaki karakter "menapak" (bayangan kontak) |
| 3 | Kesan cahaya | Dalam 2 detik terbaca "sore hangat": berkas jendela, bayangan panjang searah, debu hanya di dalam sinar, lampu berpendar tanpa menyilaukan, warna tidak keruh, tanpa belang gradasi |
| 4 | Keserasian karakter | Karakter pemilik tetap dikenali (bentuk dan warna sama). Tidak tampak "ditempel": ikut gelap dan terang, punya bayangan, terbaca di atas lantai |
| 5 | Kelancaran | HUD: p90 ≤ 20 ms di tingkat 0 atau 1, tanpa sentakan saat geser. Bingkai pertama ≤ 1,5 detik. Memori stabil |
| 6 | Perbandingan | Pemilik memilih 3D dibanding Canvas pada tangkapan yang sama |

- **Prototipe dinyatakan gagal bila** setelah a3 + satu sesi revisi:
  - aspek 1 atau 6 tetap tidak lulus, atau
  - aspek 5 tidak lulus bahkan di tingkat 3, atau
  - aspek 4 tidak lulus setelah rim, garis luar, dan pencahayaan dicoba.
- **Opsi pemilik saat gagal:**
  - **(A) Paket aset pixel berlisensi:**
    - pemilik memilih dan membeli; lisensinya diperiksa dulu;
    - cukup menambah `ManifestSource` dan berkas pemetaan, mesinnya tetap;
    - risikonya gaya paket harus cocok dengan karakter pemilik.
  - **(B) Kembali ke Canvas:**
    - `main` tidak pernah tersentuh, tag aman ada;
    - cabang 5H disimpan sebagai arsip.
- **Bila waktu kurang, dipangkas berurutan:**
  1. siang/malam (d);
  2. debu;
  3. DOF diganti tilt-shift;
  4. geser kamera;
  5. bayangan panjang karakter (cukup bayangan kontak);
  6. varian per ubin (cukup 2);
  7. polesan kejar-kejaran.

## 8. Risiko dan penanganannya

| Risiko | Penanganan |
| --- | --- |
| **Hasil 3D dari kode lebih jelek daripada Canvas sekarang** (risiko terbesar) | Prototipe kecil dulu dengan gerbang penilaian dan pembanding sisi-sisian; palet dan bahan v4 yang sudah disetujui dipakai ulang; kepadatan pixel sama dengan Canvas; bila gagal, opsi A atau B tanpa kerugian di `main` |
| Pixel berkilau atau "berenang" | Resolusi dalam texel = piksel, skala bulat, FOV sempit, kamera hanya geser dengan grid + sisa halus di komposit, posisi sprite dibulatkan, tanpa mipmap, tekstur dihindari dari garis 1 texel berkontras tinggi |
| Lambat di grafis terpadu | Resolusi dalam kecil, batas 30 FPS, penjaga performa bertingkat, pindah otomatis ke Canvas, diukur pemilik di GPU terpadu |
| Ukuran unduhan | `import()` dinamis hanya di Beranda dan lab; batas ≤ 200 KB gzip, diperiksa saat build |
| Karakter beda kepadatan (19–56 px) atau tampak tempelan | 1:1 tanpa resample, pencahayaan + rim + bayangan, garis luar opsional; dinilai tiap karakter di b |
| Konteks WebGL hilang atau bug driver | `webglcontextlost` → Canvas seketika, dunia tetap jalan |
| Shader rumit, waktu molor | Satu langkah per sesi, daftar pangkas, Opus untuk shader yang macet |
| Cabang menjauh dari `main` (Tahap 11B–11E jalan di `main`; 11C menyentuh Beranda) | Kode 3D di berkas baru, `dashboard.tsx` baru disentuh di (c); `main` digabung ke cabang sebelum (c); disarankan 11C selesai sebelum (c) |
| Bocor memori di sesi panjang | Pembuangan lengkap + uji pasang/lepas 20× + `renderer.info.memory` |
| Pengukuran di panel pratinjau tidak akurat | Angka resmi dari pemilik (HUD + DevTools), saya memakai beban per bingkai dan pemeriksa three |
| Hak cipta gambar acuan | Hanya acuan suasana, tidak ada yang disalin; `docs/referensi-antarmuka/` tetap tidak di-commit |

## Git, paket, dan aturan

- **Tag versi aman:** `versi-aman-canvas` (beranotasi) di `fa52982`, dibuat sebelum kerja apa pun. Push tag hanya bila disetujui.
- **Cabang:** `tahap-5h-diorama-3d` dari `main`. Cabang lama `cadangan-sebelum-rewrite` tidak disentuh.
- **Paket:** hanya `three` + `@types/three`, setelah izin terpisah di awal a1.
- **Aturan tetap:**
  - tidak ada commit sebelum disetujui;
  - commit tanpa baris Co-Authored-By;
  - tidak meng-commit `claude.md`, `docs/referensi-antarmuka/`, `docs/prototipe/`;
  - Pest tetap `kasir_test`; server tidak berubah, Pest dijalankan sebagai penjaga;
  - karakter pemilik tidak diganti atau digambar ulang.
- **Saran yang perlu izin (tidak dikerjakan tanpa persetujuan):** menghormati `prefers-reduced-motion` dari sistem operasi (geser kamera dan debu mati). Pemilik sebelumnya membuang mode hemat daya, jadi ini hanya usul.

## Berkas penting

- **Baru:**
  - `resources/js/diorama/view/`: `types.ts`, `choose-backend.ts`, `canvas-view.ts`;
  - `resources/js/diorama/three/`: `webgl-view.ts`, `camera.ts`, `build-store.ts`, `actors.ts`, `lights.ts`, `post/composite.ts`, `post/shaders.ts`, `perf.ts`, `project.ts`, `palette-world.ts`;
  - `resources/js/diorama/assets/`: `atlas.ts`, `procedural-source.ts`, `procedural/*.ts`;
  - `resources/js/components/diorama/diorama-stage.tsx`, `resources/js/pages/diorama-3d-lab.tsx`;
  - rute `diorama-3d-lab` di `routes/web.php` (grup `role:admin`);
  - tes `*.test.ts` di samping tiap modul murni.
- **Diubah (baru di langkah c):**
  - `pages/dashboard.tsx`;
  - `components/beranda/post-button.tsx`, `post-notice`, `customer-card`, `use-customer-pick.ts` (menerima titik layar dari view);
  - `engine/posts.ts` (tambah `postAnchorTile`).
- **Dipakai ulang tanpa diubah:**
  - `engine/world.ts`, `feed.ts`, `loop.ts`, `shelves.ts`, `clock.ts`, `sound-cues.ts`, `rng.ts`;
  - `scenes/store-scene.ts`;
  - `sprites/reference-*.ts`, `customer-sprite.ts`, `pixels.ts`, `palette.ts`;
  - `render/customer-info.ts`;
  - seluruh `PlaceholderRenderer` untuk Canvas.

## Verifikasi

- **Tiap langkah:**
  - `npx vp test run` (lalu Vite dijalankan ulang), `npx tsc --noEmit`, `npx vp lint`, `./vendor/bin/pint --test`, `php artisan test` (kasir_test), `npm run build` (ukuran potongan three dicatat);
  - lab dibuka di browser, tangkapan layar di 1366×768 dan 1920×1080, konsol bersih;
  - HUD dan beban per bingkai dicatat;
  - pemilik menilai, dan pemilik mengukur di GPU terpadu.
- **Langkah c:**
  - Beranda sebagai admin, kasir, bendahara;
  - simulasi pesanan di `/diorama-lab` memunculkan pelanggan di Beranda 3D;
  - klik pelanggan, tombol pos (mouse dan keyboard), penolakan pos;
  - `?render=canvas` identik dengan sekarang;
  - kehilangan konteks dipaksa (`WEBGL_lose_context`) → pindah ke Canvas tanpa kehilangan antrean;
  - uji pasang/lepas memori.

