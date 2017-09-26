# CCHAT-STOCK

[![Backers on Open Collective](https://opencollective.com/acgn-stock/backers/badge.svg)](#backers)
[![Sponsors on Open Collective](https://opencollective.com/acgn-stock/sponsors/badge.svg)](#sponsors)


A stock system simulator game which use acgn characters as company.

## How to send your requirement or issue

1. sign in your github account
2. choose issue label
3. click new issue 
4. write title and body
5. send and wait for contributors reponse

## How to start my own acgn-stock game?

1. Install [Meteor](https://www.meteor.com/install)
2. git clone this project from github
3. type `meteor npm install` in project folder
4. type `meteor` in project folder

## 股市規則

1.帳號系統：
任何人都可以用Gmail帳號或PTT的帳號在股票系統上註冊帳號。若使用PTT帳號進行註冊，必須另外通過認證。認證方法請參閱下方功能說明的帳號驗證。

2.股票的上市：
任何人皆可以申請為某個ACGN作品的角色創立公司，做法是在「新創計劃」頁面底下點擊「建立新角色」。新創計劃申請之後會有十二個小時的投資期限，在期限內，任何通過驗證的使用者皆可對此新創計劃進行投資，最低投資金額為```$100```，最高投資金額為```$4096```。一但投資成功，金錢就會立刻從使用者帳戶中扣除。只要期限到達且最終的投資人數在```10人以上```，公司便會創立。若投資期限到達後投資人數仍未達```10人```，則新創失敗，投資將退款給投資人。

新創公司創立成功後，初始股價將定為```$1```，投資人以當初的投資額兌換為同等價格的股份。然而若釋出的初始股份數量因此```大於2000```，那初始股價則會乘以```2```，直到釋出股份數量```小於等於2000```為止。當初始股價在$1元以上時，投資額當初投資金額不足購買1股股份的額度將會退款給投資人。但這個退款動作也可能導致釋出的初始股份小於1000，此時股價則會除以2回來，在此情況下，初始釋出股份會大於2000。

3.經理人與公司產品：
當公司創立後，最初申請創立計劃的人即為該公司的經理人。經理人可以為負責的公司推出產品，為了避免儲存空間不夠的問題，系統內只存放「通往真正作品網頁」的連結，產品可以是同人圖、ANSI、同人文等等，產品的原作者不一定會是經理人，但請經理人在發布產品時務必通過原作者的同意，一但被原作者舉報，情節嚴重者將會取消經理人資格。

4.經理人的更迭：
除了申請創立公司成為經理人，使用者還競爭已存在公司的經理人位置，一但有驗證通過的使用者競爭經理人，在下個商業季度開始後，所有持有該公司股票的股東便可以對所有競爭者進行投票，各股東的票權與其持股比率相當，在下個商業季度結束時，所得票權最高的參選人便可成為經理人。除此之外，公司的經理人隨時可以辭職不幹。

5.公司的收益：
一週為一個商業季度。每個商業季度結束時，上個商業季度推出的產品將會進入投票榜，所有通過驗證的使用者將會視當季的產品數量得到相同數量的推薦票，並對自己喜愛的產品投票推薦，每張推薦票都可以令產品公司獲得一定數量的營利額。商業季度結束後，公司的收益金額將分出```百分之五```作為經理人的薪水，之後扣除缺```百分之十五```的營運成本，剩餘的收益金額則依照持股比例由股東均分。

6.買入股票：
當公司成立之後，所有人就可以開始對該公司的股票下達購買訂單，下單時需決定「願意購買的每股單價」與「購買數量」，但每股單價不可偏離參考股價的```15%```。一但下單成功，金錢就會立刻從使用者帳戶中扣除。確立的買入訂單可以取消，但需要付出```$1```的手續費用。

7.賣出股票：
當公司成立之後，持有股票者可以在任何時候下達販賣訂單，下單時需決定「願意出手的每股最低單價」與「賣出數量」，但每股單價不可偏離參考股價的```15%```。一但下單成功，持有股份會立刻從使用者帳戶中扣除。確立的賣出訂單可以取消，但需要付出```$1```的手續費用。

8.股票的交易：
當有任何使用者下達任何買賣訂單時，系統會先檢視是否有價格優於或等於新訂單的訂單存在，若存在任何價格相符的訂單，則自動以「已存在的訂單價格」為準進行股票交易。直到新訂單的交易數量大於所有已存在的價格符合訂單的交易數量為止。舉例而言，若該公司存在三筆以單價10、15、20購入10股股票的訂單，此時有人下達了以單價15賣出25股股票的訂單，則此訂單會先以20單價賣出10股，再15單價賣出10股，最後留下5股未交易的15單價賣出5股的訂單留在訂單列表中。在沒有任何股票成交時，股價不會有任何的變動。

每隔```三到六小時```的隨機時間，系統會以股票的當前交易價格取代其參考價格。

9.股票的釋出：
每經過```一到三小時```會檢查一次全股市，檢查時自動截取全股市```最高股價的一半```為釋股門檻，若一家公司的股價超過釋股門檻價格，且市面上不存在任何由系統釋出的股票賣單，系統就會自動釋出股票到市場上套利。釋出股票數量的上限為```「其股價減渠釋股門檻價格再除以2」```與```「百分之五的總釋股數量」```取其低值，下限為```1股```，取上限與下限之間的隨機整數作為真正的釋出數量。
舉例而言，若一家公司的股價是全股市最高價的$500，且已釋出股票數量大於5000（百分之五為250），那每次釋股將釋出1(最低釋股下限)到125(上限為當前股價500減去釋股門檻250再除以2)之間的隨機數字。
釋出股票時的股票單價為該股票當時的參考價格，交易過程與正常股票交易方式相同：價高者得，未立刻被購買完畢的釋股會正常的成為市場上的賣單。
整個釋股交易流程按照正常的交易方式影響股價。釋股過程裡售賣股票獲得的金額將算入該公司商業季度的營利額中。
此外，每經過```一天到兩天```會檢查一次全股市，若一家公司存在有「買入價格為可下單最高價格」的「高價買單」尚未完全交易完畢，且最近```一天```的股票```總成交量的十倍```小於```「所有高價買單的未成交量」```，那該公司也會自動釋股，此時釋股價格為下達買單的可下單最高價格，釋股數量為```1到「所有高價買單未成交量的一半」```之間的隨機數字。交易過程與營利的處理方式與第一種釋股方式一致。

10.低價股特別設定：
參考價格低於全市場股價的```第一四分位數```的股票將被視為低價股。購買低價股時，最高單價可為參考股價的```130%```，而非```115%```。
此外，每隔```十二小時```，若一家低價股的「高價買單」未成交數量高於其總釋股數量的```百分之一```，則該公司會進行額外釋股以滿足買單需求。此時的釋股價格為可下單的最高價格，額外釋股的釋股數量不會超出當時總釋股數量的```百分之五```。

11.帳戶的金錢來源：
所有使用者在通過驗證後皆可以領到```一萬元```的起始資金，每經過```二十四小時```，所有通過驗證的使用者都會再得到```一千元```的薪資。除此之外，每個商業季度結束時，經理人與股東皆可獲得公司收益的分紅。

12.公開透明原則：
所有股票的買單、賣單、交易紀錄與所有帳戶的下單行為、持股量皆是公開的，任何一位已通過認證的帳戶都可以在「帳號資訊」頁面查詢得知。

## Contributors

This project exists thanks to all the people who contribute. [[Contribute]](CONTRIBUTING.md).
<a href="graphs/contributors"><img src="https://opencollective.com/acgn-stock/contributors.svg?width=890" /></a>


## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/acgn-stock#backer)]

<a href="https://opencollective.com/acgn-stock#backers" target="_blank"><img src="https://opencollective.com/acgn-stock/backers.svg?width=890"></a>


## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/acgn-stock#sponsor)]

<a href="https://opencollective.com/acgn-stock/sponsor/0/website" target="_blank"><img src="https://opencollective.com/acgn-stock/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/acgn-stock/sponsor/1/website" target="_blank"><img src="https://opencollective.com/acgn-stock/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/acgn-stock/sponsor/2/website" target="_blank"><img src="https://opencollective.com/acgn-stock/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/acgn-stock/sponsor/3/website" target="_blank"><img src="https://opencollective.com/acgn-stock/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/acgn-stock/sponsor/4/website" target="_blank"><img src="https://opencollective.com/acgn-stock/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/acgn-stock/sponsor/5/website" target="_blank"><img src="https://opencollective.com/acgn-stock/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/acgn-stock/sponsor/6/website" target="_blank"><img src="https://opencollective.com/acgn-stock/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/acgn-stock/sponsor/7/website" target="_blank"><img src="https://opencollective.com/acgn-stock/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/acgn-stock/sponsor/8/website" target="_blank"><img src="https://opencollective.com/acgn-stock/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/acgn-stock/sponsor/9/website" target="_blank"><img src="https://opencollective.com/acgn-stock/sponsor/9/avatar.svg"></a>


