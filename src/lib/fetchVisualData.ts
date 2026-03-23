export interface VisualDataResponse {
  items: Array<{
    visual_data_id: string;
    visual_json: unknown;
    dimension_id: number;
    work_id: string;
    work_version_id: string;
    thumbnail_file_info: {
      url: string;
    };
    hash: string;
    metadata: Record<string, any>;
  }>;
  meta: {
    count: number;
  };
}

export async function fetchVisualData(
  workUrl: string,
  jwt: string,
): Promise<VisualDataResponse> {
  // Parse the work URL: https://<DOMAIN>/.../work/creative?workId=<WORK_ID>
  let urlObj;
  try {
    urlObj = new URL(workUrl);
  } catch (e) {
    throw new Error('Invalid URL format');
  }

  const workId = urlObj.searchParams.get('workId');
  if (!workId) {
    throw new Error('No workId found in URL search params');
  }

  const domain = urlObj.origin; // e.g. https://stg.trypncl.com
  const targetApiUrl = `${domain}/api/work-proxy/v1/visual_data?work_id=${workId}`;

  // Call through our local proxy to avoid CORS
  const proxyUrl = `/api-proxy?url=${encodeURIComponent(targetApiUrl)}`;

  const response = await fetch(proxyUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorText = '';
    try {
      const errorJson = await response.json();
      errorText = JSON.stringify(errorJson);
    } catch (e) {
      errorText = await response.text();
    }
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // If visual_json is a string, parse it
  if (data.items && Array.isArray(data.items)) {
    for (const item of data.items) {
      if (typeof item.visual_json === 'string') {
        try {
          item.visual_json = JSON.parse(item.visual_json);
        } catch (e) {
          console.error('Failed to parse visual_json string', e);
        }
      }
    }
  }

  return data as VisualDataResponse;
}
