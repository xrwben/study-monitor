const axios  = require('axios')
const https = require('https');
const agent = new https.Agent({  
    rejectUnauthorized: false
})
const minimist = require('minimist')
let argv = []
  try {
    argv = JSON.parse(process.env.npm_config_argv).original
  } catch (ex) {
    argv = process.argv
  }
const args = minimist(argv.slice(2))
const {tag, env, token, id} = args
console.log('tag, env, token, id, args', tag, env, token, id, args)
//通过工蜂接口触发自动打tag，并将选择环境传入message中。具体参考链接：https://git.woa.com/help/menu/api/tags.html
axios({
  url: `https://git.woa.com/api/v3/projects/${id}/repository/tags?private_token=${token}`,
  method: "post",
  responseType: "json",
  timeout: 5000,
  httpsAgent: agent,
  data: {
    "id": id,
    "tag_name": tag,
    "ref": "master",
    "message": env
  }
}).then(({data}) => {
    if (data.code !== 0) {
        console.log('success: ', data, data.message)
    }
}).catch(e => {
    console.error("error is: ", e.message)
})
