// src/components/UploadZone.tsx
'use client'

import { useRef, useState } from 'react'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return
    onFiles(Array.from(fileList))
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="上传图片"
      className={`cursor-pointer rounded-card border-2 border-dashed px-6 py-12 text-center transition ${
        dragging
          ? 'border-brand-500 bg-brand-50'
          : 'border-brand-300 bg-white/60 hover:border-brand-400 hover:bg-brand-50/60'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="text-4xl">📤</div>
      <p className="mt-3 font-medium text-ink">点击选择或拖拽多张壁纸到这里</p>
      <p className="mt-1 text-xs text-ink/50">支持 JPG / PNG / WEBP，图片保存在浏览器本地（IndexedDB）</p>
    </div>
  )
}
