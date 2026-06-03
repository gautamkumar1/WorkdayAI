import React from 'react'
import { useResumeStore } from '../../store/resumeStore'

export default function ResumePreview() {
  const { parsedData, file, clearResume } = useResumeStore()

  if (!parsedData) return null

  const skills = parsedData.skills ?? []
  const experience = parsedData.experience ?? []
  const education = parsedData.education ?? []
  const certifications = parsedData.certifications ?? []

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{parsedData.name}</h2>
          <p className="text-xs text-gray-500">{file?.name}</p>
        </div>
        <button
          onClick={clearResume}
          className="text-xs text-red-600 hover:text-red-800 hover:underline"
        >
          Clear Resume
        </button>
      </div>

      <div className="flex flex-col gap-1 text-sm text-gray-700">
        <div className="flex gap-2">
          <span className="font-medium w-14 shrink-0 text-gray-500">Email</span>
          <span>{parsedData.email}</span>
        </div>
        {parsedData.phone && (
          <div className="flex gap-2">
            <span className="font-medium w-14 shrink-0 text-gray-500">Phone</span>
            <span>{parsedData.phone}</span>
          </div>
        )}
        {parsedData.location && (
          <div className="flex gap-2">
            <span className="font-medium w-14 shrink-0 text-gray-500">Location</span>
            <span>{parsedData.location}</span>
          </div>
        )}
      </div>

      {skills.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 text-sm">
        <div className="rounded-md bg-gray-100 px-3 py-2 text-center">
          <p className="text-lg font-bold text-gray-900">{experience.length}</p>
          <p className="text-xs text-gray-500">Experience</p>
        </div>
        <div className="rounded-md bg-gray-100 px-3 py-2 text-center">
          <p className="text-lg font-bold text-gray-900">{education.length}</p>
          <p className="text-xs text-gray-500">Education</p>
        </div>
        {certifications.length > 0 && (
          <div className="rounded-md bg-gray-100 px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{certifications.length}</p>
            <p className="text-xs text-gray-500">Certs</p>
          </div>
        )}
      </div>
    </div>
  )
}
