const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zoogridyyxzukuinveft.supabase.co', 'sb_publishable_giG96AlBHIxx9pMtQ0xkVA_Fjkd7w8x');
async function test() {
  const { data, error } = await supabase.from('funcionarios').select('count', { count: 'exact', head: true });
  console.log('Result:', {data, error});
}
test();
