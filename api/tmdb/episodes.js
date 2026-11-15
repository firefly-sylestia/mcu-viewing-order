export default async function handler(req,res){
if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
const token=process.env.TMDB_READ_ACCESS_TOKEN||'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2NWVkYTQ4Y2Y1ODAzZjIyMzA0ZmQyMWY0ZjA2YTM1ZSIsIm5iZiI6MTc3ODY4NTg2My42ODcsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.XTD8e-B7awrTVIJd5WtD3vZ5FnWjE8sWkSjgYIeauAA';
const tmdbId=String(req.query.tmdbId||'').trim(),season=String(req.query.season||'').trim();
if(!/^\d+$/.test(tmdbId)||!/^\d+$/.test(season))return res.status(400).json({error:'Valid TMDB ID and season are required.'});
try{const response=await fetch('https://api.themoviedb.org/3/tv/'+tmdbId+'/season/'+season+'?language=en-US',{headers:{Authorization:'Bearer '+token,accept:'application/json'}});if(!response.ok)return res.status(response.status).json({error:'TMDB episode lookup failed.'});const data=await response.json();return res.status(200).json({tmdbId,season:Number(season),episodes:(data.episodes||[]).map(ep=>({episode_number:ep.episode_number,name:ep.name,overview:ep.overview,still:ep.still_path?'https://image.tmdb.org/t/p/w300'+ep.still_path:null,air_date:ep.air_date,runtime:ep.runtime}))});}catch{return res.status(500).json({error:'Failed to fetch season episodes.'});}
}
