const { Auth } = require('msmc');

async function loginMicrosoft() {
  const authManager = new Auth('select_account');
  
  // Opens browser for Microsoft sign-in
  const xboxManager = await authManager.launch('electron');
  
  // Get Minecraft token
  const token = await xboxManager.getMinecraft();
  
  return {
    accessToken: token.mc.access_token,
    username: token.profile.name,
    uuid: token.profile.id,
    refreshToken: token.ms.refresh_token
  };
}

module.exports = { loginMicrosoft };
