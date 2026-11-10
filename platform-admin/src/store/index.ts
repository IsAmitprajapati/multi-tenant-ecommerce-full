import { configureStore } from '@reduxjs/toolkit'
import authReducer from './auth/authSlice'
import usersReducer from './users/userSlice'

export const store = configureStore({
  reducer: {
    auth : authReducer,
    user : usersReducer
  },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch