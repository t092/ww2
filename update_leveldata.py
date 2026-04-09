import re

with open('levelData.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add images
replacements = [
    ("badge:{name:'新政推手',icon:'📻'},", "badge:{name:'新政推手',icon:'📻'},\n    image: 'images/ch03-depression.jpg',"),
    ("badge:{name:'革命觀察家',icon:'☭'},", "badge:{name:'革命觀察家',icon:'☭'},\n    image: 'images/ch03-russian-revolution.jpg',"),
    ("badge:{name:'反極權勇士',icon:'🦅'},", "badge:{name:'反極權勇士',icon:'🦅'},\n    image: 'images/ch03-fascist-italy.jpg',"),
    ("badge:{name:'情報分析員',icon:'🔍'},", "badge:{name:'情報分析員',icon:'🔍'},\n    image: 'images/ch03-nazi-germany.jpg',"),
    ("badge:{name:'戰略分析師',icon:'⚔️'},", "badge:{name:'戰略分析師',icon:'⚔️'},\n    image: 'images/ch03-axis-powers.jpg',"),
    ("badge:{name:'烽火見證者',icon:'🔥'},", "badge:{name:'烽火見證者',icon:'🔥'},\n    image: 'images/ch03-blitzkrieg.jpg',"),
    ("badge:{name:'勝利指揮官',icon:'🏆'},", "badge:{name:'勝利指揮官',icon:'🏆'},\n    image: 'images/ch03-normandy.jpg',"),
    ("badge:{name:'和平守護者',icon:'🕊️'},", "badge:{name:'和平守護者',icon:'🕊️'},\n    image: 'images/ch03-united-nations.jpg',")
]

for old, new in replacements:
    content = content.replace(old, new)

# Replace sorting challenge in level 4
old_challenge = """      { type:'sorting', title:'🎯 擴張之路排序', instruction:'請依時間先後排列德國的侵略步伐：',
        items:[
          '1938年：併吞奧地利',
          '1938年：進占捷克蘇臺德區（英法簽慕尼黑協定妥協）',
          '1939年：毀約併吞捷克全境',
          '1939年：與蘇聯簽《德蘇互不侵犯條約》後入侵波蘭'
        ]}"""

new_challenge = """      { type:'map-drag', title:'🎯 擴張之路地圖', instruction:'請將事件拖放至地圖上的正確位置（由下而上、由西而東）：',
        bgImage: 'images/ch03-europe-map.jpg',
        points:[
          {id:'p1', x: 55, y: 70, answer: '1938年：併吞奧地利'},
          {id:'p2', x: 50, y: 55, answer: '1938年：進占捷克蘇臺德區（英法簽慕尼黑協定妥協）'},
          {id:'p3', x: 62, y: 50, answer: '1939年：毀約併吞捷克全境'},
          {id:'p4', x: 75, y: 35, answer: '1939年：與蘇聯簽《德蘇互不侵犯條約》後入侵波蘭'}
        ]}"""

content = content.replace(old_challenge, new_challenge)

with open('levelData.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("levelData.js updated successfully")
