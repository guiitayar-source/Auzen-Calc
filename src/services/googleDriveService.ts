const FILE_NAME = 'auzen_backup.json';
const FOLDER_NAME = 'Auzen Calc Backups';

// 1. Garante que a pasta existe e retorna o ID dela
async function getOrCreateFolder(token: string): Promise<string> {
  const query = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Se não existe, cria
  const createRes = await fetch(`https://www.googleapis.com/drive/v3/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  const folder = await createRes.json();
  return folder.id;
}

// 2. Procura se o arquivo já existe no Drive (dentro da pasta específica)
async function findBackupFileId(token: string, folderId: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Falha ao buscar arquivo no Google Drive.');
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

// 2. Faz o Upload (Cria ou Atualiza)
export async function uploadBackup(token: string, backupData: any): Promise<void> {
  const folderId = await getOrCreateFolder(token);
  const fileId = await findBackupFileId(token, folderId);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata: any = {
    name: FILE_NAME,
    mimeType: 'application/json',
  };

  // Se for criação, define a pasta pai
  if (!fileId) {
    metadata.parents = [folderId];
  }

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(backupData) +
    closeDelimiter;

  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart` // Update
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`; // Create

  const method = fileId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method: method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    throw new Error('Falha ao fazer upload do backup.');
  }
}

// 4. Faz o Download (Busca o ID e baixa o conteúdo)
export async function downloadBackup(token: string): Promise<any> {
  const folderId = await getOrCreateFolder(token);
  const fileId = await findBackupFileId(token, folderId);
  
  if (!fileId) {
    throw new Error('Nenhum backup encontrado no Google Drive.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Falha ao baixar o backup.');
  }

  const data = await res.json();
  return data;
}
