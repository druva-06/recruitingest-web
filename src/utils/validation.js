export const MAX_FILE_SIZE = 20 * 1024 * 1024

export function validateFile(file) {
  if (!file) return 'Choose a PDF file to continue.'
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return 'Only PDF documents are supported.'
  }
  if (file.size > MAX_FILE_SIZE) return 'This file is larger than the 20 MB limit.'
  return ''
}
