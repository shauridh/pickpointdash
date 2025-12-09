import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    role?: string
    phone?: string
  }

  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      role?: string
      phone?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    phone?: string
  }
}
