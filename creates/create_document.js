const dynamicFields = async (z, bundle) => {
  const listPlaceholderOptions = {
    url: 'https://api.docsautomator.co/zapierListPlaceholders',
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    params: {
      docId: bundle.inputData.docId,
    },
  };

  const getAutomation = {
    url: 'https://api.docsautomator.co/getZapierAutomation',
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    params: {
      docId: bundle.inputData.docId,
    },
  };

  const automationResponse = await z.request(getAutomation);
  const automation = automationResponse.data[0];

  // Return copy fields if automation has no data source or document template link
  // return copy field if no data source
  if (!automation.dataSourceName) {
    return [
      {
        key: 'noDataSource',
        label: 'Automation has no data source set.',
        type: 'copy',
        helpText:
          'This automation does not have a data source. Please set a data source in the automation settings to proceed.',
      },
    ];
  }

  // return copy field if no template (Google Doc, PDF, or Word)
  if (
    !automation.googleDocTemplate &&
    !automation.hasPdfTemplate &&
    !automation.hasWordTemplate
  ) {
    return [
      {
        key: 'noDocTemplateLink',
        label: 'Automation has no document template set.',
        type: 'copy',
        helpText:
          'This automation does not have a document template. Please set a document template in the automation settings to proceed.',
      },
    ];
  }

  if (automation.dataSourceName === 'Airtable') {
    return {
      key: 'recId',
      label: 'Airtable Record ID',
      type: 'string',
      required: true,
      helpText: 'Enter the Airtable record ID',
    };
  }

  if (automation.dataSourceName === 'ClickUp') {
    return {
      key: 'taskId',
      label: 'ClickUp Task ID',
      type: 'string',
      required: true,
      helpText: 'Enter the ClickUp task ID',
    };
  }

  if (
    automation.dataSourceName === 'API' ||
    automation.dataSourceName === 'Zapier'
  ) {
    const response = await z.request(listPlaceholderOptions);

    const results = response.data;

    if (!results.length) {
      return [
        {
          key: 'noPlaceholders',
          label: 'No placeholders found',
          type: 'copy',
          helpText:
            'No placeholders were found in the document template. Please add placeholders to the document template to proceed.',
        },
      ];
    }

    const primaryFields = results
      .filter((placeholder) => !placeholder.includes('line_items_'))
      .map((placeholder) => ({
        key: placeholder,
        label: `${placeholder}`,
        type: 'string',
        required: false,
        helpText: `Enter the value for ${placeholder}`,
      }));

    const documentNameField = [
      {
        key: 'documentName',
        label: 'Document Name',
        type: 'string',
        helpText:
          'Please define a name for generated documents. Of course you can select data from previous steps.',
        required: false,
        list: false,
        altersDynamicFields: false,
      },
    ];

    const lineItemGroups = results.filter((placeholder) =>
      placeholder.startsWith('line_items_')
    );

    // Group by the number following 'line_items_' (assuming a consistent naming pattern)
    const groupMap = new Map();
    lineItemGroups.forEach((placeholder) => {
      const match = placeholder.match(/line_items_(\d+)/);
      const groupKey = match ? `line_items_${match[1]}` : 'line_items';
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey).push({
        key: placeholder,
        label: `${placeholder}`,
        type: 'string',
        required: false,
        helpText: `Enter the value for ${placeholder}`,
      });
    });

    // Convert the map to an array of grouped field objects
    const lineItemArr = Array.from(groupMap).map(([key, children]) => ({
      key,
      children,
    }));

    return [
      ...documentNameField,
      ...primaryFields,
      ...lineItemArr,
    ];
  }
};

const perform = async (z, bundle) => {
  const apiKey = bundle.authData.api_key || process.env.API_KEY; // Use API key from bundle or fallback to environment variable

  const options = {
    url: 'https://api.docsautomator.co/createDocument',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`, // Include the API key in the Authorization header
    },
    body: bundle.inputData,
  };

  return z.request(options).then((response) => {
    const results = response.json;
    return results;
  });
};

module.exports = {
  display: {
    description: 'Create a document from a template.',
    hidden: false,
    label: 'Create Document',
  },
  key: 'create_document',
  noun: 'document',
  operation: {
    inputFields: [
      {
        key: 'docId',
        label: 'Automation',
        type: 'string',
        dynamic: 'user_automations.id.title',
        helpText:
          'Please select your automation. Depending on the data source, you will be asked for additional information in the next step.',
        required: true,
        list: false,
        altersDynamicFields: true,
      },
      dynamicFields,
    ],
    perform: perform,
    sample: {
      docId: '64bbc8eec756ddddcd4e73fc',
      documentName: 'Invoices 2024',
      key1: 'value1',
      key2: 'value2',
      line_items: [
        {
          line_items_key1: 'line_items_value1',
          line_items_key2: 'line_items_value2',
        },
        {
          line_items_key1: 'line_items_value3',
          line_items_key2: 'line_items_value4',
        },
      ],
    },
  },
};
