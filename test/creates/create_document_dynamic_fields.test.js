const createDocument = require('../../creates/create_document');

// The dynamicFields function is the second inputField
const dynamicFields = createDocument.operation.inputFields[1];

// Mock z.request to return controlled responses
const createMockZ = (automationData, placeholders = []) => ({
  request: jest.fn((options) => {
    if (options.url.includes('getZapierAutomation')) {
      return Promise.resolve({ data: [automationData] });
    }
    if (options.url.includes('zapierListPlaceholders')) {
      return Promise.resolve({ data: placeholders });
    }
    return Promise.reject(new Error('Unexpected request'));
  }),
});

const bundle = { inputData: { docId: 'test-doc-id' } };

describe('dynamicFields - template validation', () => {
  it('should show error when no data source is set', async () => {
    const z = createMockZ({
      dataSourceName: null,
      googleDocTemplate: null,
      hasPdfTemplate: false,
    });

    const result = await dynamicFields(z, bundle);
    expect(result).toEqual([
      expect.objectContaining({ key: 'noDataSource' }),
    ]);
  });

  it('should show error when no template is set (neither Google Doc, PDF, nor Word)', async () => {
    const z = createMockZ({
      dataSourceName: 'Zapier',
      googleDocTemplate: null,
      hasPdfTemplate: false,
      hasWordTemplate: false,
    });

    const result = await dynamicFields(z, bundle);
    expect(result).toEqual([
      expect.objectContaining({ key: 'noDocTemplateLink' }),
    ]);
  });

  it('should pass validation with a Word template (no Google Doc or PDF)', async () => {
    const z = createMockZ(
      {
        dataSourceName: 'Zapier',
        googleDocTemplate: null,
        hasPdfTemplate: false,
        hasWordTemplate: true,
      },
      ['client_name', 'meeting_date']
    );

    const result = await dynamicFields(z, bundle);
    // Should NOT return the noDocTemplateLink error
    const hasError = Array.isArray(result) && result.some((f) => f.key === 'noDocTemplateLink');
    expect(hasError).toBe(false);
    // Should return placeholder fields
    const fieldKeys = (Array.isArray(result) ? result : [result]).map((f) => f.key);
    expect(fieldKeys).toContain('client_name');
  });

  it('should pass validation with a Google Doc template', async () => {
    const z = createMockZ(
      {
        dataSourceName: 'Zapier',
        googleDocTemplate: 'https://docs.google.com/document/d/abc123',
        hasPdfTemplate: false,
      },
      ['client_name', 'invoice_number']
    );

    const result = await dynamicFields(z, bundle);
    // Should NOT return the noDocTemplateLink error
    const hasError = Array.isArray(result) && result.some((f) => f.key === 'noDocTemplateLink');
    expect(hasError).toBe(false);
    // Should return placeholder fields
    const fieldKeys = (Array.isArray(result) ? result : [result]).map((f) => f.key);
    expect(fieldKeys).toContain('client_name');
  });

  it('should pass validation with a PDF template (no Google Doc)', async () => {
    const z = createMockZ(
      {
        dataSourceName: 'Zapier',
        googleDocTemplate: null,
        hasPdfTemplate: true,
      },
      ['client_name', 'amount']
    );

    const result = await dynamicFields(z, bundle);
    // Should NOT return the noDocTemplateLink error
    const hasError = Array.isArray(result) && result.some((f) => f.key === 'noDocTemplateLink');
    expect(hasError).toBe(false);
    // Should return placeholder fields
    const fieldKeys = (Array.isArray(result) ? result : [result]).map((f) => f.key);
    expect(fieldKeys).toContain('client_name');
  });

  it('should pass validation with both Google Doc and PDF template', async () => {
    const z = createMockZ(
      {
        dataSourceName: 'Zapier',
        googleDocTemplate: 'https://docs.google.com/document/d/abc123',
        hasPdfTemplate: true,
      },
      ['field1']
    );

    const result = await dynamicFields(z, bundle);
    const hasError = Array.isArray(result) && result.some((f) => f.key === 'noDocTemplateLink');
    expect(hasError).toBe(false);
  });

  it('should return Airtable record ID field for Airtable data source with PDF template', async () => {
    const z = createMockZ({
      dataSourceName: 'Airtable',
      googleDocTemplate: null,
      hasPdfTemplate: true,
    });

    const result = await dynamicFields(z, bundle);
    expect(result).toEqual(
      expect.objectContaining({ key: 'recId' })
    );
  });

  it('should return ClickUp task ID field for ClickUp data source with PDF template', async () => {
    const z = createMockZ({
      dataSourceName: 'ClickUp',
      googleDocTemplate: null,
      hasPdfTemplate: true,
    });

    const result = await dynamicFields(z, bundle);
    expect(result).toEqual(
      expect.objectContaining({ key: 'taskId' })
    );
  });

  it('should handle line item placeholders correctly', async () => {
    const z = createMockZ(
      {
        dataSourceName: 'Zapier',
        googleDocTemplate: null,
        hasPdfTemplate: true,
      },
      ['client_name', 'line_items_1_product', 'line_items_1_price']
    );

    const result = await dynamicFields(z, bundle);
    const fieldKeys = result.map((f) => f.key);
    expect(fieldKeys).toContain('documentName');
    expect(fieldKeys).toContain('client_name');
    expect(fieldKeys).toContain('line_items_1');
  });
});
