#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "chatgpt_interface_image",
    czech: "Webové rozhraní ChatGPT",
  english: "ChatGPT Web Interface",
definition: terms => [Snímek úplného webového rozhraní ChatGPT v prohlížeči.],
  description: terms => [Snímek ukazuje celé rozhraní chatgpt.com včetně postranního panelu, aktivní konverzace a vstupního pole.],
  visual: terms => [
#figure(
  image("/DarkFactory/img/external/chatgpt-web.png", width: 100%),
  caption: [Webové rozhraní ChatGPT. Zdroj: OpenAI Developer Community.],
)
  ],
  citations: (bib.openai_chatgpt_web,),
)
