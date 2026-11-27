# Kredit aset HD-2D

Semua gambar di folder ini dibuat untuk proyek ini dengan **Higgsfield, model GPT Image 2.6** (`gpt_image_2_6`) pada **27 November 2026**. Pembayarannya memakai kredit akun Plus pemilik proyek. Tidak ada aset dari game atau karya lain yang disalin, dan prompt menyebut gaya "original HD-2D-inspired pixel art" tanpa nama game.

Pasca-proses dilakukan dengan skrip Node tanpa paket tambahan:

1. Gambar diperkecil 4× dengan nearest, mengambil piksel tengah tiap blok.
2. Palet diringkas menjadi 32 warna per gambar atau lembar (median cut lalu k-means).
3. Properti dibuat biner alpha-nya (ambang 128).
4. Ikon disimpan dengan 4 tingkat alpha (0, 96, 176, 255), sehingga botol, plastik, uap, dan gelembung tetap bening.
5. Lembar properti dipotong per komponen, lembar ikon dipotong per sel 3×3. Serpih kecil yang terlepas dibuang.

| Folder | Isi | Ukuran | Job Higgsfield |
| --- | --- | --- | --- |
| `latar/` | `konsep-senja.png`, latar layar judul dari concept art | 672×380 | `68dd4edb-921c-4e1b-bb5c-c441df8afb4f` |
| `tekstur/` | `jalan-batu.png` | 256×256 | `90a28ba0-341d-42d9-8d51-10a1e99a6e3b` |
| `tekstur/` | `dinding-plester.png` (dipotong ke baris 12–962 agar menyambung) | 256×238 | `d607aa5b-dd8e-440b-9e15-e0454836cffb` |
| `tekstur/` | `atap-genteng.png` | 256×256 | `15c6bf09-4073-41cc-a198-8ef267aea76a` |
| `tekstur/` | `papan-kayu.png` | 256×256 | `c2616cfd-e715-42fe-b375-4f50cec685fc` |
| `properti/` | `lampu-jalan`, `tong`, `peti`, `tanaman-pot`, `pohon-kecil` | beragam | `2d00815b-2ef2-4f82-848b-5f562ac7890e` |
| `properti/` | `semak`, `bangku`, `papan-nama-ramuan`, `meja-lapak`, `karung` | beragam | `e621cd39-3c8f-438f-90c3-65d28ee1f13b` |
| `ikon/` | `air-mineral`, `teh-botol`, `kopi`, `biskuit`, `keripik`, `cokelat`, `beras`, `mi-instan`, `sabun` | ±64×70 | `21140b76-e23c-46e1-9b4f-c11b5bb15c29` |

Keempat tekstur bisa diulang tanpa sambungan dan sudah diuji dengan susunan 3×3.

Prompt lengkap tiap aset ada di `docs/hd2d-prompts.txt`. Berkas mentah beresolusi besar tidak disimpan di repo.

Karakter penjaga toko (zombie) **bukan** buatan Higgsfield. Itu karakter gambar pemilik di `resources/js/diorama/sprites/referensi/`.
