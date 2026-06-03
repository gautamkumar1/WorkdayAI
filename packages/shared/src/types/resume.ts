export interface WorkExperience {
  company: string
  title: string
  startDate: string
  endDate: string | null
  current: boolean
  description: string
  location: string | null
}

export interface Education {
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string | null
  gpa: string | null
}

export interface Certification {
  name: string
  issuer: string
  date: string | null
}

export interface ResumeData {
  name: string
  email: string
  phone: string | null
  location: string | null
  summary: string | null
  experience: WorkExperience[]
  education: Education[]
  skills: string[]
  certifications: Certification[]
  links: {
    linkedin?: string
    github?: string
    portfolio?: string
    [key: string]: string | undefined
  }
}
