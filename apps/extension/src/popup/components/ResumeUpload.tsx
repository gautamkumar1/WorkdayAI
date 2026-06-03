import React, { useRef, useState } from 'react'
import { useResumeStore } from '../../store/resumeStore'
import { useResumeUpload } from '../../hooks/useResumeUpload'

export default function ResumeUpload() {
  const { parseStatus, parseError } = useResumeStore()
  const mutation = useResumeUpload()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const isParsing = parseStatus === 'parsing' || mutation.isPending

  function handleFile(file: File) {
    if (!file.name.match(/\.(pdf|docx)$/i)) return
    mutation.mutate(file)
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload resume"
        className={[
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors',
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50',
          isParsing ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {isParsing ? (
          <>
            <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-gray-600">Parsing resume…</p>
          </>
        ) : (
          <>
            <svg
              className="h-10 w-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16v-8m0 0-3 3m3-3 3 3M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              Drop your resume here or click to upload
            </p>
            <p className="text-xs text-gray-400">Accepted formats: PDF, DOCX</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={onInputChange}
      />

      {parseStatus === 'error' && parseError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-700">{parseError}</p>
        </div>
      )}
    </div>
  )
}
