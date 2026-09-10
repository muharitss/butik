import assert from 'node:assert/strict';
import {
  fetchGarmentTypes,
  fetchGarmentType,
  createGarmentType,
  updateGarmentType,
  deactivateGarmentType,
} from './api/garments.api.ts';

async function runGarmentSelfChecks() {
  const originalFetch = globalThis.fetch;

  try {
    // 1. fetchGarmentTypes with query params
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.ok(url.includes('/api/garment-types?includeInactive=true&q=kebaya'));
      assert.equal(init?.method, 'GET');
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 'gt-1',
              name: 'Kebaya Modern',
              isActive: true,
              measurementFields: [
                {
                  id: 'mf-1',
                  garmentTypeId: 'gt-1',
                  fieldKey: 'chest',
                  label: 'Lingkar Dada',
                  unit: 'cm',
                  isRequired: true,
                  sortOrder: 0,
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const listRes = await fetchGarmentTypes({ includeInactive: true, q: 'kebaya' });
    assert.equal(listRes.length, 1);
    assert.equal(listRes[0].name, 'Kebaya Modern');
    assert.equal(listRes[0].measurementFields.length, 1);
    assert.equal(listRes[0].measurementFields[0].fieldKey, 'chest');

    // 2. fetchGarmentType by id
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/garment-types/gt-1');
      assert.equal(init?.method, 'GET');
      return new Response(
        JSON.stringify({
          data: {
            id: 'gt-1',
            name: 'Kebaya Modern',
            isActive: true,
            measurementFields: [],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const singleRes = await fetchGarmentType('gt-1');
    assert.equal(singleRes.id, 'gt-1');
    assert.equal(singleRes.name, 'Kebaya Modern');

    // 3. createGarmentType
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/garment-types');
      assert.equal(init?.method, 'POST');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.name, 'Jas Pria');
      assert.equal(body.measurementFields?.length, 1);
      assert.equal(body.measurementFields[0].fieldKey, 'shoulder_width');
      return new Response(
        JSON.stringify({
          data: {
            id: 'gt-2',
            name: 'Jas Pria',
            isActive: true,
            measurementFields: [
              {
                id: 'mf-2',
                garmentTypeId: 'gt-2',
                fieldKey: 'shoulder_width',
                label: 'Lebar Bahu',
                unit: 'cm',
                isRequired: true,
                sortOrder: 0,
              },
            ],
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const createRes = await createGarmentType({
      name: 'Jas Pria',
      measurementFields: [
        {
          fieldKey: 'shoulder_width',
          label: 'Lebar Bahu',
          unit: 'cm',
          isRequired: true,
          sortOrder: 0,
        },
      ],
    });
    assert.equal(createRes.id, 'gt-2');
    assert.equal(createRes.name, 'Jas Pria');
    assert.equal(createRes.measurementFields[0].fieldKey, 'shoulder_width');

    // 4. updateGarmentType
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/garment-types/gt-2');
      assert.equal(init?.method, 'PATCH');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.name, 'Jas Pria Slim Fit');
      return new Response(
        JSON.stringify({
          data: {
            id: 'gt-2',
            name: 'Jas Pria Slim Fit',
            isActive: true,
            measurementFields: [],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const updateRes = await updateGarmentType('gt-2', { name: 'Jas Pria Slim Fit' });
    assert.equal(updateRes.name, 'Jas Pria Slim Fit');

    // 5. deactivateGarmentType
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/garment-types/gt-2/deactivate');
      assert.equal(init?.method, 'PATCH');
      return new Response(
        JSON.stringify({
          data: {
            id: 'gt-2',
            name: 'Jas Pria Slim Fit',
            isActive: false,
            measurementFields: [],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const deactivateRes = await deactivateGarmentType('gt-2');
    assert.equal(deactivateRes.id, 'gt-2');
    assert.equal(deactivateRes.isActive, false);

    console.log('✓ All Garment feature self-checks passed successfully!');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runGarmentSelfChecks().catch((err) => {
  console.error('Garment self-check failed:', err);
  process.exit(1);
});
