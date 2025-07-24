// Supabase client configuration for Chrome extension
class SupabaseClient {
  constructor() {
    // TODO: Replace with your actual Supabase project URL and anon key
    this.supabaseUrl = 'https://rutygmuemvduycgnykuo.supabase.com';
    this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dHlnbXVlbXZkdXljZ255a3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMzQ0NDcsImV4cCI6MjA2ODkxMDQ0N30.eJ08X5mr7iqIqKUsAIvO7eetJoqjeHXdfJiizkHaD9Y';
    this.client = null;
    this.init();
  }

  async init() {
    try {
      // Wait for Supabase library to be available
      await this.waitForSupabase();
      
      this.client = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey, {
        auth: {
          storage: new ChromeStorageAdapter(),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        }
      });
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  async waitForSupabase() {
    return new Promise((resolve, reject) => {
      const maxAttempts = 50; // 5 seconds max wait
      let attempts = 0;
      
      const checkSupabase = () => {
        attempts++;
        
        if (window.supabase && window.supabase.createClient) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Supabase library failed to load'));
        } else {
          setTimeout(checkSupabase, 100);
        }
      };
      
      checkSupabase();
    });
  }

  async loadSupabaseLib() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Authentication methods
  async signUp(email, password, userData = {}) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });
    return { data, error };
  }

  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  }

  async signInWithOAuth(provider) {
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: chrome.runtime.getURL('sidebar/panel.html')
      }
    });
    return { data, error };
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    return { error };
  }

  async getUser() {
    const { data: { user }, error } = await this.client.auth.getUser();
    return { user, error };
  }

  async getSession() {
    const { data: { session }, error } = await this.client.auth.getSession();
    return { session, error };
  }

  // Profile methods
  async getUserProfile(userId) {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data, error };
  }

  async updateUserProfile(userId, profileData) {
    const { data, error } = await this.client
      .from('profiles')
      .upsert({
        user_id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    return { data, error };
  }

  // Application tracking methods
  async saveApplication(userId, applicationData) {
    const { data, error } = await this.client
      .from('applications')
      .insert({
        user_id: userId,
        ...applicationData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    return { data, error };
  }

  async getUserApplications(userId, limit = 50) {
    const { data, error } = await this.client
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return { data, error };
  }

  // File upload methods
  async uploadFile(bucket, fileName, file) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(fileName, file);
    return { data, error };
  }

  async getFileUrl(bucket, fileName) {
    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(fileName);
    return data?.publicUrl;
  }
}

// Chrome Storage adapter for Supabase auth
class ChromeStorageAdapter {
  async getItem(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  }

  async setItem(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }

  async removeItem(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => {
        resolve();
      });
    });
  }
}

// Export for use in other files
window.SupabaseClient = SupabaseClient;
