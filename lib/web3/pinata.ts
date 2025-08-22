// lib/web3/pinata.ts
export async function uploadToPinata(data: any): Promise<string> {
  try {
    const res = await fetch('/api/upload-json-to-pinata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload metadata');
    }

    const result = await res.json();
    return result.ipfsHash;
  } catch (error) {
    console.error('Error in uploadToPinata:', error);
    throw new Error('Failed to upload JSON to IPFS');
  }
}


export async function uploadImageToPinata(imageUrl: string): Promise<string> {
  try {
    const response = await fetch('/api/upload-image-to-pinata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image to IPFS');
    }

    const data = await response.json();
    return data.ipfsUrl;
  } catch (error) {
    console.error('Error uploading image to Pinata:', error);
    throw new Error('Failed to upload image to IPFS');
  }
}
