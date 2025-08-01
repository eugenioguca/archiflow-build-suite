import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, Image, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Badge } from './badge'

interface DragDropUploaderProps {
  onFilesSelected: (files: File[]) => void
  accept?: Record<string, string[]>
  multiple?: boolean
  maxSize?: number
  className?: string
  children?: React.ReactNode
  showPreview?: boolean
}

interface FileWithPreview extends File {
  preview?: string
}

export function DragDropUploader({
  onFilesSelected,
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'application/pdf': ['.pdf'],
    'text/*': ['.txt', '.csv'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
  },
  multiple = true,
  maxSize = 10 * 1024 * 1024, // 10MB
  className,
  children,
  showPreview = true
}: DragDropUploaderProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const filesWithPreview = acceptedFiles.map(file => {
      const fileWithPreview = file as FileWithPreview
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file)
      }
      return fileWithPreview
    })
    
    setFiles(prev => multiple ? [...prev, ...filesWithPreview] : filesWithPreview)
    onFilesSelected(acceptedFiles)
  }, [onFilesSelected, multiple])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxSize
  })

  const removeFile = (fileToRemove: FileWithPreview) => {
    setFiles(prev => prev.filter(file => file !== fileToRemove))
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview)
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />
    if (file.type === 'application/pdf') return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200",
          "hover:border-primary/50 hover:bg-accent/20",
          isDragActive && "border-primary bg-primary/10 scale-105",
          isDragReject && "border-destructive bg-destructive/10",
          className
        )}
      >
        <input {...getInputProps()} />
        
        {children || (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className={cn(
                "h-6 w-6 transition-transform duration-200",
                isDragActive && "scale-110 text-primary"
              )} />
            </div>
            
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí'}
              </p>
              <p className="text-sm text-muted-foreground">
                o haz click para seleccionar archivos
              </p>
              <p className="text-xs text-muted-foreground">
                Máximo {formatFileSize(maxSize)} por archivo
              </p>
            </div>
          </div>
        )}
      </div>

      {showPreview && files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Archivos seleccionados:</h4>
          <div className="grid gap-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg border"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                    {getFileIcon(file)}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {formatFileSize(file.size)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {file.type}
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}