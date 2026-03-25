export interface Hub {
  id: string
  name: string
  region: string
  type: string
}

export interface Project {
  id: string
  name: string
  type: string
  attributes: {
    name: string
    extension?: {
      type: string
      data?: {
        projectType?: string
      }
    }
  }
  relationships?: {
    hub?: {
      data?: {
        id: string
      }
    }
  }
}

export interface HubsResponse {
  data: HubData[]
}

export interface HubData {
  id: string
  attributes: {
    name: string
    region: string
  }
  type: string
}

export interface ProjectsResponse {
  data: ProjectData[]
}

export interface ProjectData {
  id: string
  attributes: {
    name: string
    extension?: {
      type: string
    }
  }
  type: string
}
