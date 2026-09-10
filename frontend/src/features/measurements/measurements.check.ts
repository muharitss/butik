import assert from 'node:assert/strict';
import {
  MEASUREMENT_VOCABULARY,
  MEASUREMENT_PRESETS,
  getFieldInfo,
} from './constants/vocabulary.ts';
import {
  fetchCurrentMeasurement,
  fetchMeasurementHistory,
  createMeasurementVersion,
} from './api/measurements.api.ts';

async function runMeasurementSelfChecks() {
  console.log('Running Measurement feature self-checks...');
  const originalFetch = globalThis.fetch;

  try {
    // 1. Check vocabulary definitions and integrity
    assert.ok(MEASUREMENT_VOCABULARY.length >= 40, 'Vocabulary should have at least 40 tailoring fields');
    
    // Check known keys
    const chestInfo = getFieldInfo('chest');
    assert.equal(chestInfo.unit, 'cm');
    assert.equal(chestInfo.category, 'atasan');

    const lingkarDadaInfo = getFieldInfo('lingkar_dada');
    assert.equal(lingkarDadaInfo.label, 'Lingkar Dada');
    assert.equal(lingkarDadaInfo.unit, 'cm');

    const pinggangInfo = getFieldInfo('lingkar_pinggang');
    assert.equal(pinggangInfo.label, 'Lingkar Pinggang');
    assert.equal(pinggangInfo.category, 'bawahan');

    // Check fallback for custom/unknown key
    const customInfo = getFieldInfo('panjang_kustom');
    assert.equal(customInfo.label, 'Panjang Kustom');
    assert.equal(customInfo.unit, 'cm');

    // 2. Check presets integrity
    for (const preset of MEASUREMENT_PRESETS) {
      assert.ok(preset.id.length > 0);
      assert.ok(preset.label.length > 0);
      assert.ok(preset.fieldKeys.length > 0);
      // Ensure all preset keys belong to vocabulary
      for (const key of preset.fieldKeys) {
        const found = MEASUREMENT_VOCABULARY.some((v) => v.key === key);
        assert.ok(found, `Preset ${preset.id} references known vocabulary key: ${key}`);
      }
    }

    // 3. Test fetchCurrentMeasurement (200 OK case)
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/customers/cust-123/measurements/current');
      assert.equal(init?.method, 'GET');
      return new Response(
        JSON.stringify({
          data: {
            id: 'mv-1',
            customerId: 'cust-123',
            versionNumber: 1,
            measuredAt: '2026-09-10T10:00:00.000Z',
            label: 'Fitting Awal',
            notes: 'Nyaman dan pas',
            createdAt: '2026-09-10T10:05:00.000Z',
            values: [
              { id: 'val-1', measurementVersionId: 'mv-1', fieldKey: 'lingkar_dada', value: 92, unit: 'cm' },
              { id: 'val-2', measurementVersionId: 'mv-1', fieldKey: 'panjang_baju', value: 72, unit: 'cm' },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const currentResult = await fetchCurrentMeasurement('cust-123');
    assert.ok(currentResult !== null);
    assert.equal(currentResult?.versionNumber, 1);
    assert.equal(currentResult?.values.length, 2);
    assert.equal(currentResult?.values[0].fieldKey, 'lingkar_dada');

    // 4. Test fetchCurrentMeasurement (404 NOT_FOUND case -> returns null)
    globalThis.fetch = async (input) => {
      assert.equal(String(input), '/api/customers/cust-empty/measurements/current');
      return new Response(
        JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'No measurement version found for this customer',
          },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const emptyResult = await fetchCurrentMeasurement('cust-empty');
    assert.equal(emptyResult, null, 'Should return null when customer has no measurements (404)');

    // 5. Test fetchMeasurementHistory
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/customers/cust-123/measurements');
      assert.equal(init?.method, 'GET');
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 'mv-2',
              customerId: 'cust-123',
              versionNumber: 2,
              measuredAt: '2026-09-10T12:00:00.000Z',
              label: 'Koreksi Lebar Bahu',
              notes: 'Lebar bahu dilebarkan 2cm',
              createdAt: '2026-09-10T12:05:00.000Z',
              values: [
                { id: 'val-3', measurementVersionId: 'mv-2', fieldKey: 'lingkar_dada', value: 92, unit: 'cm' },
                { id: 'val-4', measurementVersionId: 'mv-2', fieldKey: 'lebar_bahu', value: 46, unit: 'cm' },
              ],
            },
            {
              id: 'mv-1',
              customerId: 'cust-123',
              versionNumber: 1,
              measuredAt: '2026-09-10T10:00:00.000Z',
              label: 'Fitting Awal',
              createdAt: '2026-09-10T10:05:00.000Z',
              values: [
                { id: 'val-1', measurementVersionId: 'mv-1', fieldKey: 'lingkar_dada', value: 92, unit: 'cm' },
                { id: 'val-2', measurementVersionId: 'mv-1', fieldKey: 'lebar_bahu', value: 44, unit: 'cm' },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const historyResult = await fetchMeasurementHistory('cust-123');
    assert.equal(historyResult.length, 2);
    assert.equal(historyResult[0].versionNumber, 2);
    assert.equal(historyResult[1].versionNumber, 1);

    // 6. Test createMeasurementVersion
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/customers/cust-123/measurements');
      assert.equal(init?.method, 'POST');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.label, 'Fitting Lebaran');
      assert.equal(body.values.length, 2);
      assert.equal(body.values[0].fieldKey, 'lingkar_dada');
      assert.equal(body.values[0].value, 94);

      return new Response(
        JSON.stringify({
          data: {
            id: 'mv-3',
            customerId: 'cust-123',
            versionNumber: 3,
            measuredAt: body.measuredAt,
            label: body.label,
            notes: body.notes,
            createdAt: '2026-09-10T14:00:00.000Z',
            values: [
              { id: 'val-5', measurementVersionId: 'mv-3', fieldKey: 'lingkar_dada', value: 94, unit: 'cm' },
              { id: 'val-6', measurementVersionId: 'mv-3', fieldKey: 'panjang_baju', value: 73, unit: 'cm' },
            ],
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const created = await createMeasurementVersion('cust-123', {
      measuredAt: '2026-09-10T14:00:00.000Z',
      label: 'Fitting Lebaran',
      notes: 'Kain sutra',
      values: [
        { fieldKey: 'lingkar_dada', value: 94, unit: 'cm' },
        { fieldKey: 'panjang_baju', value: 73, unit: 'cm' },
      ],
    });

    assert.equal(created.id, 'mv-3');
    assert.equal(created.versionNumber, 3);
    assert.equal(created.label, 'Fitting Lebaran');
    assert.equal(created.values.length, 2);

    console.log('✓ All Measurement feature self-checks passed successfully!');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runMeasurementSelfChecks().catch((err) => {
  console.error('Measurement self-check failed:', err);
  process.exit(1);
});
