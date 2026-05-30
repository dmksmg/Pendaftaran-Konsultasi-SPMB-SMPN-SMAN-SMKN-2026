var SPREADSHEET_ID = '1ASHtHbSeGP0NLuaFPKf_cN6ccsddyOCkvwsGy4Ns3pA';

function getSheetByName(name) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name);
}

function rowsToObjects(values) {
  if (!values || values.length < 1) return [];
  var headers = values[0].map(function(h) { return (''+h).trim(); });
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      // Jika value bertipe Date, format ke timezone Asia/Jakarta (WIB)
      if (val instanceof Date) {
        try {
          val = Utilities.formatDate(val, 'Asia/Jakarta', "dd/MM/yyyy HH:mm 'WIB'");
        } catch (e) {
          val = val.toString();
        }
      } else if (typeof val === 'string') {
        // Jika string berbentuk ISO (contoh: 2026-05-29T17:00:00.000Z), parse dan format ke WIB
        var isoMatch = val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z?$/);
        if (isoMatch) {
          try {
            var d = new Date(val);
            if (!isNaN(d.getTime())) {
              val = Utilities.formatDate(d, 'Asia/Jakarta', "dd/MM/yyyy HH:mm 'WIB'");
            }
          } catch (e) {
            // leave as-is
          }
        }
      }
      obj[headers[j]] = val;
    }
    out.push(obj);
  }
  return out;
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

    if (action === 'validasi') {
      var sheet = getSheetByName('Validasi');
      if (!sheet) return jsonResponse({ error: 'Sheet Validasi tidak ditemukan' });
      var vals = sheet.getDataRange().getValues();
      if (!vals || vals.length < 2) return jsonResponse({ smpn: [], sman: [], smkn: [], tempat: [] });

      var headers = vals[0].map(function(h){ return (''+h).trim(); });
      var smpnIdx = headers.findIndex(function(h){ return /smpn/i.test(h); });
      var smanIdx = headers.findIndex(function(h){ return /sman/i.test(h); });
      var smknIdx = headers.findIndex(function(h){ return /smkn/i.test(h); });
      var tempatIdx = headers.findIndex(function(h){ return /tempat/i.test(h); });

      var smpnSet = [];
      var smanSet = [];
      var smknSet = [];
      var tempatSet = [];

      for (var r = 1; r < vals.length; r++) {
        var row = vals[r];
        if (smpnIdx >= 0) {
          var v = (row[smpnIdx] || '').toString().trim();
          if (v && smpnSet.indexOf(v) === -1) smpnSet.push(v);
        }
        if (smanIdx >= 0) {
          var v2 = (row[smanIdx] || '').toString().trim();
          if (v2 && smanSet.indexOf(v2) === -1) smanSet.push(v2);
        }
        if (smknIdx >= 0) {
          var v3 = (row[smknIdx] || '').toString().trim();
          if (v3 && smknSet.indexOf(v3) === -1) smknSet.push(v3);
        }
        if (tempatIdx >= 0) {
          var v4 = (row[tempatIdx] || '').toString().trim();
          if (v4 && tempatSet.indexOf(v4) === -1) tempatSet.push(v4);
        }
      }

      return jsonResponse({ smpn: smpnSet, sman: smanSet, smkn: smknSet, tempat: tempatSet });
    }

    if (action === 'data_masuk') {
      var sheet2 = getSheetByName('Data masuk');
      if (!sheet2) return jsonResponse({ data: [] });
      var values = sheet2.getDataRange().getValues();
      var objects = rowsToObjects(values);
      return jsonResponse(objects);
    }

    // default: provide minimal info
    return jsonResponse({ ok: true, message: 'Apps Script webapp running' });
  } catch (err) {
    return jsonResponse({ error: err.message || err.toString() });
  }
}

function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try { payload = JSON.parse(e.postData.contents); } catch (err) { payload = {}; }
    }

    var sheet = getSheetByName('Data masuk');
    if (!sheet) return jsonResponse({ error: 'Sheet Data masuk tidak ditemukan' });

    // Determine row data based on expected header order (attempt to match provided headers)
    var headers = sheet.getDataRange().getValues()[0] || [];
    var row = [];
    for (var i = 0; i < headers.length; i++) {
      var key = (''+headers[i]).trim();
      // map common keys to payload fields
      var value = '';
      if (key.match(/timestamp/i)) value = payload.timestamp || new Date();
      else if (key.match(/nama/i) && key.match(/siswa/i)) value = payload.namaSiswa || '';
      else if (key.match(/whats/i) || key.match(/no.*whats/i) || key.match(/no.*wa/i)) value = payload.whatsappSiswa || payload.whatsappOrangTua || '';
      else if (key.match(/orang/i) && key.match(/tua/i)) value = payload.namaOrangTua || '';
      else if (key.match(/alamat/i)) value = payload.alamatRumah || '';
      else if (key.match(/jalur/i)) value = payload.jalurMasuk || '';
      else if (key.match(/sekolah/i) || key.match(/target/i)) value = payload.sekolahTarget || '';
      else if (key.match(/tempat/i)) value = payload.tempatKonsultasi || '';
      else if (key.match(/status/i)) value = payload.status || payload.statusGabungGrup || '';
      else value = payload[key] || '';

      row.push(value);
    }

    sheet.appendRow(row);
    return jsonResponse({ status: 'success' });
  } catch (err) {
    return jsonResponse({ error: err.message || err.toString() });
  }
}

function jsonResponse(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
