const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zoogridyyxzukuinveft.supabase.co', 'sb_publishable_giG96AlBHIxx9pMtQ0xkVA_Fjkd7w8x');
async function test() {
  const { data, error, count } = await supabase.from('funcionarios').select('*', { count: 'exact' }).limit(1);
  console.log('Result:', {data, error, count});
}
test();
