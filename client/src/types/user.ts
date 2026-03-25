export interface UserProfile {
  userId: string
  userName: string
  emailId: string
  firstName: string
  lastName: string
  profileImages?: {
    sizeX40?: string
    sizeX50?: string
    sizeX58?: string
    sizeX80?: string
    sizeX120?: string
    sizeX160?: string
    sizeX176?: string
    sizeX240?: string
    sizeX360?: string
  }
}

export interface AuthStatus {
  authenticated: boolean
  user: UserProfile | null
}
