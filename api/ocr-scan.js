import Groq from 'groq-sdk';

/**
 * Serverless Handler untuk OCR Scan Dokumen Dumas / LP menggunakan Groq Vision SDK
 * Endpoint: /api/ocr-scan
 */
export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const rawApiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "";
  const apiKeys = rawApiKey
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  if (apiKeys.length === 0) {
    return res.status(500).json({
      success: false,
      error: "GROQ_API_KEY belum dikonfigurasi di environment server.",
    });
  }

  try {
    const { images } = req.body || {};
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Payload gambar tidak valid atau kosong.",
      });
    }

    // Format gambar ke format OpenAI/Groq image_url
    const formattedImages = images.map((img) => {
      let dataUrl = "";
      if (typeof img === "string") {
        dataUrl = img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`;
      } else if (img.base64Data) {
        dataUrl = img.base64Data.startsWith("data:")
          ? img.base64Data
          : `data:${img.mimeType || "image/jpeg"};base64,${img.base64Data}`;
      } else if (img.data) {
        dataUrl = img.data.startsWith("data:")
          ? img.data
          : `data:${img.mimeType || "image/jpeg"};base64,${img.data}`;
      } else if (img.url) {
        dataUrl = img.url;
      }
      return {
        type: "image_url",
        image_url: { url: dataUrl },
      };
    });

    // Prompt kedinasan Satreskrim untuk ekstraksi entitas formil dan kronologis dokumen verbatim
    const systemPrompt = `Anda adalah asisten AI resmi Satreskrim Kepolisian Republik Indonesia (POLRI).
TUGAS UTAMA: Ekstraksi OCR dokumen pengaduan/laporan masyarakat ke format JSON secara presisi.

ATURAN KETAT KRONOLOGIS & URAIAN KEJADIAN:
Salin seluruh kronologis atau uraian kejadian persis sesuai teks asli dokumen yang dipindai tanpa meringkas, memotong, atau mengubah redaksinya. Tampilkan narasi selengkap-lengkapnya (full transcript).

PENTING:
- DILARANG KERAS mengulang-ulang kalimat atau kata yang sama berkali-kali. Jika teks dalam dokumen sudah selesai atau terpotong, segera akhiri narasi.
- Tuliskan hanya fakta yang benar-benar terbaca di dokumen secara bersih dan koheren.

ATURAN IDENTITAS PELAPOR & PIHAK:
- Pada bagian "ttl" pelapor: Masukkan string Tempat dan Tanggal Lahir utuh apa adanya sebagaimana tertulis pada dokumen (contoh: "Kolaka, 12 Mei 1990"), JANGAN memisahkan tempat dan tanggal lahir, dan JANGAN mengubah ke format tanggal ISO.
- Pastikan selalu menutup struktur JSON dengan sempurna (tutup kurung kurawal dan siku valid).

FORMAT WAJIB JSON (Hanya kembalikan objek JSON valid tanpa kata pengantar atau markdown):
{
  "pidana": "jenis dugaan tindak pidana",
  "pasal": "pasal sangkaan KUHP/UU",
  "waktu": "waktu/hari/tgl/jam kejadian (tempus delicti)",
  "tkp": "tempat kejadian perkara (locus delicti)",
  "uraian": "salin seluruh kronologis atau uraian kejadian persis sesuai teks asli dokumen yang dipindai tanpa meringkas, memotong, atau mengubah redaksinya. Tampilkan narasi selengkap-lengkapnya (full transcript)",
  "nomor_surat": "",
  "tanggal_surat": "",
  "pelapor": { "nama": "", "nik": "", "ttl": "", "pekerjaan": "", "agama": "Islam", "alamat": "", "hp": "" },
  "terlapor": [ { "nama": "", "nik": "", "ttl": "", "pekerjaan": "", "agama": "Islam", "alamat": "", "hp": "" } ],
  "saksi": [ { "nama": "", "nik": "", "ttl": "", "pekerjaan": "", "agama": "Islam", "alamat": "", "hp": "" } ]
}`;

    const userMessageContent = [
      {
        type: "text",
        text: "Analisis seluruh lembar dokumen fisik di atas. Ekstrak ke format JSON. PENTING: Salin seluruh kronologis atau uraian kejadian persis sesuai teks asli dokumen yang dipindai tanpa meringkas, memotong, atau mengubah redaksinya. Tampilkan narasi selengkap-lengkapnya (full transcript). Ekstrak TTL pelapor sebagai satu string utuh. Wajib selesaikan dan tutup kurung kurawal JSON secara valid.",
      },
      ...formattedImages,
    ];

    // Model vision aktif katalog Groq: qwen/qwen3.8-27b
    const model = process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";

    const requestParams = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessageContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 3500,
      frequency_penalty: 0.5,
      presence_penalty: 0.3,
    };

    // Sembunyikan reasoning format pada model Qwen agar kompatibel penuh dengan json_object mode
    if (model.includes("qwen")) {
      requestParams.reasoning_format = "hidden";
    }

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const isRateLimitError = (err) => {
      const errStr = String(err?.message || '');
      return (
        err?.status === 429 ||
        errStr.includes('429') ||
        errStr.toLowerCase().includes('rate limit') ||
        errStr.toLowerCase().includes('tokens per minute') ||
        errStr.toLowerCase().includes('rate_limit')
      );
    };

    let completion = null;
    let lastError = null;

    // Iterasi melalui pool key yang tersedia jika terjadi error 429 / rate limit.
    // Jika hanya ada 1 key, berikan kesempatan 1x retry. Jika banyak key, lakukan rotasi ke key berikutnya.
    const maxAttempts = apiKeys.length === 1 ? 2 : apiKeys.length;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const keyIndex = attempt % apiKeys.length;
      const currentApiKey = apiKeys[keyIndex];
      const groq = new Groq({ apiKey: currentApiKey });

      console.log(`[Groq OCR] Menjalankan pemindaian (Attempt ${attempt + 1}/${maxAttempts}) menggunakan API Key #${keyIndex + 1} (${currentApiKey.substring(0, 6)}...)`);

      try {
        try {
          completion = await groq.chat.completions.create(requestParams);
        } catch (firstErr) {
          if (isRateLimitError(firstErr)) {
            throw firstErr;
          }

          const errStr = String(firstErr?.message || '');
          const isJsonValidateErr = firstErr?.status === 400 || 
            errStr.includes('json_validate_failed') || 
            errStr.includes('max completion tokens') ||
            errStr.includes('400');

          if (isJsonValidateErr) {
            console.warn('[Groq OCR] Terdeteksi 400 json_validate_failed / token limit, melakukan fallback call...');
            const fallbackParams = { ...requestParams };
            delete fallbackParams.response_format;
            completion = await groq.chat.completions.create(fallbackParams);
          } else {
            throw firstErr;
          }
        }

        if (completion && completion.choices?.[0]?.message?.content) {
          break;
        }
      } catch (err) {
        lastError = err;
        if (isRateLimitError(err)) {
          console.warn(`[Groq OCR] API Key #${keyIndex + 1} terkena Rate Limit (429): ${err.message}`);
          if (attempt < maxAttempts - 1) {
            console.log('[Groq OCR] Memberikan jeda sleep 1.5 detik sebelum berganti key / mencoba kembali...');
            await sleep(1500);
            continue;
          }
        } else {
          // Jika error bukan rate limit (misal parameter tidak valid), hentikan dan lempar error
          throw err;
        }
      }
    }

    if (!completion || !completion.choices?.[0]?.message?.content) {
      if (lastError) throw lastError;
      throw new Error("Gagal menerima respons ekstraksi dari Groq Vision AI.");
    }


    const rawContent = completion.choices[0].message.content.trim();

    // Helper parser tangguh yang mampu mereparasi unclosed JSON jika terpotong di akhir token
    function repairAndParseJson(raw) {
      if (!raw || typeof raw !== 'string') {
        throw new Error('Konten teks respons kosong.');
      }

      let text = raw.trim();

      // Bersihkan codeblock markdown
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch && codeBlockMatch[1]) {
        text = codeBlockMatch[1].trim();
      } else {
        text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      }

      const firstBrace = text.indexOf('{');
      if (firstBrace === -1) {
        throw new Error('Tidak ditemukan kurung kurawal buka "{" pada respons AI.');
      }
      text = text.substring(firstBrace);

      // Coba parse langsung
      try {
        return JSON.parse(text);
      } catch (e) {
        // Lanjut ke perbaikan unclosed JSON
      }

      let inString = false;
      let isEscaped = false;
      const stack = [];

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inString) {
          if (isEscaped) {
            isEscaped = false;
          } else if (char === '\\') {
            isEscaped = true;
          } else if (char === '"') {
            inString = false;
          }
        } else {
          if (char === '"') {
            inString = true;
          } else if (char === '{' || char === '[') {
            stack.push(char);
          } else if (char === '}') {
            if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
          } else if (char === ']') {
            if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
          }
        }
      }

      let repaired = text;
      if (inString) {
        repaired += '"';
      }

      repaired = repaired.replace(/,\s*$/g, '').replace(/:\s*"?$/g, ': ""');

      while (stack.length > 0) {
        const unclosed = stack.pop();
        repaired = repaired.replace(/,\s*$/g, '');
        if (unclosed === '{') repaired += '}';
        else if (unclosed === '[') repaired += ']';
      }

      try {
        return JSON.parse(repaired);
      } catch (err2) {
        const lastComma = repaired.lastIndexOf(',');
        if (lastComma !== -1) {
          let trimmed = repaired.substring(0, lastComma);
          let inStr = false;
          let esc = false;
          const s2 = [];
          for (let i = 0; i < trimmed.length; i++) {
            const c = trimmed[i];
            if (inStr) {
              if (esc) esc = false;
              else if (c === '\\') esc = true;
              else if (c === '"') inStr = false;
            } else {
              if (c === '"') inStr = true;
              else if (c === '{' || c === '[') s2.push(c);
              else if (c === '}') { if (s2.length && s2[s2.length - 1] === '{') s2.pop(); }
              else if (c === ']') { if (s2.length && s2[s2.length - 1] === '[') s2.pop(); }
            }
          }
          if (inStr) trimmed += '"';
          while (s2.length > 0) {
            const u = s2.pop();
            trimmed = trimmed.replace(/,\s*$/g, '');
            trimmed += (u === '{' ? '}' : ']');
          }
          return JSON.parse(trimmed);
        }
        throw new Error('Gagal memvalidasi dan memperbaiki JSON terpotong: ' + err2.message);
      }
    }

    const parsedData = repairAndParseJson(rawContent);

    // Sinkronkan data objek peristiwa dan flat keys secara defensif
    const pObj = parsedData.peristiwa || parsedData.perkara || {};
    const finalTindakPidana = parsedData.pidana || parsedData.tindak_pidana || parsedData.dugaan_tindak_pidana || pObj.pidana || pObj.tindak_pidana || pObj.dugaan_tindak_pidana || "";
    const finalPasal = parsedData.pasal || parsedData.pasal_disangkakan || parsedData.dugaan_pasal || pObj.pasal || pObj.pasal_disangkakan || pObj.dugaan_pasal || "";
    const finalTempus = parsedData.waktu || parsedData.tempus_delicti || parsedData.waktu_kejadian || pObj.waktu || pObj.tempus_delicti || pObj.waktu_kejadian || "";
    const finalLocus = parsedData.tkp || parsedData.locus_delicti || parsedData.tempat_kejadian || pObj.tkp || pObj.locus_delicti || pObj.tempat_kejadian || "";
    const finalUraian = parsedData.uraian || parsedData.uraian_kejadian || parsedData.ringkasan_posisi_kasus || parsedData.kronologis || parsedData.ringkasan_kasus || pObj.uraian || pObj.uraian_kejadian || pObj.kronologis || pObj.ringkasan_kasus || "";

    // Normalisasi Pelapor
    const pelaporRaw = parsedData.pelapor || {};
    const normalizedPelapor = {
      nama: pelaporRaw.nama || parsedData.pelapor_nama || "",
      nik: pelaporRaw.nik || parsedData.pelapor_nik || "",
      ttl: pelaporRaw.ttl || parsedData.pelapor_ttl || "",
      pekerjaan: pelaporRaw.pekerjaan || parsedData.pelapor_pekerjaan || "",
      agama: pelaporRaw.agama || parsedData.pelapor_agama || "Islam",
      alamat: pelaporRaw.alamat || parsedData.pelapor_alamat || "",
      kontak: pelaporRaw.hp || pelaporRaw.kontak || parsedData.pelapor_kontak || "",
      hp: pelaporRaw.hp || pelaporRaw.kontak || parsedData.pelapor_kontak || "",
    };

    // Normalisasi Terlapor
    const terlaporRawList = Array.isArray(parsedData.terlapor) 
      ? parsedData.terlapor 
      : (Array.isArray(parsedData.terlapor_list) ? parsedData.terlapor_list : []);
    const normalizedTerlaporList = terlaporRawList.map((t, idx) => ({
      nama: t.nama || "",
      nik: t.nik || "",
      ttl: t.ttl || "",
      pekerjaan: t.pekerjaan || "",
      agama: t.agama || "Islam",
      alamat: t.alamat || "",
      kontak: t.hp || t.kontak || "",
      hp: t.hp || t.kontak || "",
      role_label: t.role_label || (idx === 0 ? "Terlapor Utama" : `Terlapor Tambahan ${idx}`),
    }));

    // Normalisasi Saksi
    const saksiRawList = Array.isArray(parsedData.saksi) 
      ? parsedData.saksi 
      : (Array.isArray(parsedData.saksi_list) ? parsedData.saksi_list : []);
    const normalizedSaksiList = saksiRawList.map((s, idx) => ({
      nama: s.nama || "",
      nik: s.nik || "",
      ttl: s.ttl || "",
      pekerjaan: s.pekerjaan || "",
      agama: s.agama || "Islam",
      alamat: s.alamat || "",
      kontak: s.hp || s.kontak || "",
      hp: s.hp || s.kontak || "",
      role_label: s.role_label || (idx === 0 ? "Saksi Fakta" : idx === 1 ? "Saksi Terkait" : `Saksi ${idx + 1}`),
    }));

    const resultPayload = {
      // Format Ringkas
      pidana: finalTindakPidana,
      pasal: finalPasal,
      waktu: finalTempus,
      tkp: finalLocus,
      uraian: finalUraian,

      // Format Standar Formulir
      tindak_pidana: finalTindakPidana,
      dugaan_tindak_pidana: finalTindakPidana,
      dugaan_pasal: finalPasal,
      pasal_disangkakan: finalPasal,
      tempus_delicti: finalTempus,
      waktu_kejadian: finalTempus,
      locus_delicti: finalLocus,
      tempat_kejadian: finalLocus,
      uraian_kejadian: finalUraian,
      ringkasan_posisi_kasus: finalUraian,
      kronologis: finalUraian,

      nomor_surat: parsedData.nomor_surat || "",
      tanggal_surat: parsedData.tanggal_surat || "",
      pelapor: normalizedPelapor,
      pelapor_nama: normalizedPelapor.nama,
      pelapor_nik: normalizedPelapor.nik,
      pelapor_ttl: normalizedPelapor.ttl,
      pelapor_pekerjaan: normalizedPelapor.pekerjaan,
      pelapor_agama: normalizedPelapor.agama,
      pelapor_alamat: normalizedPelapor.alamat,
      pelapor_kontak: normalizedPelapor.kontak,
      terlapor: normalizedTerlaporList,
      terlapor_list: normalizedTerlaporList,
      saksi: normalizedSaksiList,
      saksi_list: normalizedSaksiList,

      peristiwa: {
        pidana: finalTindakPidana,
        tindak_pidana: finalTindakPidana,
        dugaan_tindak_pidana: finalTindakPidana,
        pasal: finalPasal,
        dugaan_pasal: finalPasal,
        pasal_disangkakan: finalPasal,
        waktu: finalTempus,
        tempus_delicti: finalTempus,
        waktu_kejadian: finalTempus,
        tkp: finalLocus,
        locus_delicti: finalLocus,
        tempat_kejadian: finalLocus,
        uraian: finalUraian,
        uraian_kejadian: finalUraian,
        ringkasan_posisi_kasus: finalUraian,
        kronologis: finalUraian,
        ...pObj,
      },
    };

    function removeRepetitiveLoops(text) {
      if (!text || typeof text !== 'string') return text;
      return text.replace(/(.{10,120}?)\s*(?:\1\s*){3,}/gis, '$1 ');
    }

    resultPayload.uraian = removeRepetitiveLoops(resultPayload.uraian);
    resultPayload.uraian_kejadian = removeRepetitiveLoops(resultPayload.uraian_kejadian);
    resultPayload.kronologis = removeRepetitiveLoops(resultPayload.kronologis);
    resultPayload.ringkasan_posisi_kasus = removeRepetitiveLoops(resultPayload.ringkasan_posisi_kasus);

    if (resultPayload.peristiwa) {
      resultPayload.peristiwa.uraian = resultPayload.uraian;
      resultPayload.peristiwa.uraian_kejadian = resultPayload.uraian_kejadian;
      resultPayload.peristiwa.kronologis = resultPayload.kronologis;
      resultPayload.peristiwa.ringkasan_posisi_kasus = resultPayload.ringkasan_posisi_kasus;
    }

    return res.status(200).json({
      success: true,
      data: resultPayload,
      modelUsed: model,
    });
  } catch (error) {
    console.error("[Groq Serverless OCR Error]:", error);

    const errorMessage = String(error?.message || '');
    const isRateLimit = error?.status === 429 || 
      errorMessage.includes('429') || 
      errorMessage.toLowerCase().includes('rate limit') ||
      errorMessage.toLowerCase().includes('tokens per minute') ||
      errorMessage.toLowerCase().includes('rate_limit');

    if (isRateLimit) {
      return res.status(429).json({
        success: false,
        isRateLimit: true,
        error: "Batas kuota request pemindaian AI (Rate Limit 429) tercapai. Silakan coba kembali dalam 30 detik atau gunakan opsi Input Manual.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Gagal memproses OCR di server: " + (error.message || error),
    });
  }
}