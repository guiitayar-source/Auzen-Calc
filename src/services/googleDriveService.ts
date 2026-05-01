const FILE_NAME = 'auzen_backup.json';
const RECOVERY_FILE_NAME = 'auzen_backup_RECUPERACAO.json';
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
async function findFileId(token: string, folderId: string, fileName: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${fileName}' and '${folderId}' in parents and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Falha ao buscar arquivo ${fileName} no Google Drive.`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

// 3. Estratégia de Rolling Backup: Copia o arquivo atual para o de recuperação
async function createRecoveryPoint(token: string, folderId: string, mainFileId: string): Promise<void> {
  // 1. Procura se já existe um arquivo de recuperação antigo
  const oldRecoveryId = await findFileId(token, folderId, RECOVERY_FILE_NAME);
  
  // 2. Se existe, apaga-o para garantir que a nova cópia seja limpa
  if (oldRecoveryId) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${oldRecoveryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // 3. Faz a cópia do arquivo principal para o nome de recuperação
  const copyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${mainFileId}/copy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: RECOVERY_FILE_NAME,
      parents: [folderId],
    }),
  });

  if (!copyRes.ok) {
    console.error('Erro ao criar ponto de recuperação, mas procedendo com o backup principal.');
  }
}

// 4. Faz o Upload (Cria ou Atualiza) com Rolling Backup
export async function uploadBackup(token: string, backupData: any): Promise<{ recoveryCreated: boolean }> {
  const folderId = await getOrCreateFolder(token);
  const fileId = await findFileId(token, folderId, FILE_NAME);
  let recoveryCreated = false;

  // Se o arquivo já existe, cria o ponto de recuperação ANTES de sobrescrever
  if (fileId) {
    try {
      await createRecoveryPoint(token, folderId, fileId);
      recoveryCreated = true;
    } catch (err) {
      console.error('Falha no Rolling Backup:', err);
      // Continuamos o backup principal mesmo se a cópia falhar por segurança
    }
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata: any = {
    name: FILE_NAME,
    mimeType: 'application/json',
  };

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
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart` 
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

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

  return { recoveryCreated };
}

// 5. Faz o Download (Busca o ID e baixa o conteúdo)
export async function downloadBackup(token: string): Promise<any> {
  const folderId = await getOrCreateFolder(token);
  const fileId = await findFileId(token, folderId, FILE_NAME);
  
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
