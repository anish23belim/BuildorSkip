const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://fzxxzvewybbhrejsdzxa.supabase.co";
const supabaseKey = "sb_publishable_ZS6fqDlaNMX0NrrbblO1_g_lEymkCuF";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDetails() {
  const targetId = 'c12bc62e-1146-4580-9648-8217d95a5b2e';
  
  console.log("Checking idea counts...");
  const { data: idea } = await supabase
    .from('ideas')
    .select('id, title, build_votes_count, skip_votes_count')
    .eq('id', targetId)
    .single();
  console.log("Idea:", idea);

  console.log("Checking all votes for this idea...");
  const { data: votes } = await supabase
    .from('votes')
    .select('*')
    .eq('idea_id', targetId);
  console.log("Votes count:", votes.length);
  console.log("Votes list:", votes);
}

checkDetails();
