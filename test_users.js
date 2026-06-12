const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://fzxxzvewybbhrejsdzxa.supabase.co";
const supabaseKey = "sb_publishable_ZS6fqDlaNMX0NrrbblO1_g_lEymkCuF";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUsers() {
  console.log("Fetching profiles...");
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');

  if (profilesError) {
    console.error("Profiles error:", profilesError);
  } else {
    console.log("Profiles count:", profiles.length);
    console.log("Profiles list:", profiles);
  }
}

testUsers();
