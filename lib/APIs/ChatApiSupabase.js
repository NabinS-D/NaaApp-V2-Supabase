import { supabase, isSupabaseConfigured } from "../supabase";

const checkSupabaseConfig = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured.');
  }
};

// Send a new message
export const sendMessage = async (senderId, content) => {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      content: content,
      // receiver_id can be null for group chat
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Fetch messages with pagination
export const getMessages = async (page = 1, pageSize = 20) => {
  checkSupabaseConfig();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!messages_sender_id_fkey(username, avatar)
    `)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return data || [];
};

// Subscribe to new messages
export const subscribeToMessages = (callback) => {
  checkSupabaseConfig();
  const subscription = supabase
    .channel('public:messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      async (payload) => {
        // Fetch the full message with user details
        const { data: newMessage, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!messages_sender_id_fkey(username, avatar)
          `)
          .eq('id', payload.new.id)
          .single();
        
        if (error) {
          console.error("Error fetching new message details:", error);
          return;
        }

        callback(newMessage);
      }
    )
    .subscribe();

  return subscription;
};
