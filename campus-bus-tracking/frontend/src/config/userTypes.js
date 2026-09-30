export const USER_TYPES = ['Student', 'Faculty', 'Driver']

export const USER_LANDING_PATHS = {
  Student: '/live-map',
  Faculty: '/routes',
  Driver: '/driver-panel',
}

export const USER_TYPE_STORAGE_KEY = 'dhsgu-user-type'

export function getStoredUserType() {
  if (typeof window === 'undefined') {
    return 'Student'
  }

  const storedType = window.localStorage.getItem(USER_TYPE_STORAGE_KEY)
  return USER_TYPES.includes(storedType) ? storedType : 'Student'
}