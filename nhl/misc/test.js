var s = "will is the coolest person on the earth and love long strings";
writeString(s)
function writeString(sString)
{
  var nLen = 15;
  var nRows =3;
  var nRowHeight = 21;	//64/3
  var nPosition = 0;
  for(var x=0; x < nRows; x++)
  {
	  var s1 = sString.substr(nPosition,nLen);
	  var nLastSpace = s1.lastIndexOf(" ");
	  nLastSpace = nLastSpace > 10 ? nLastSpace : nLen;
	  s1 = sString.substring(nPosition, (nPosition+nLastSpace)).trim();
	  nPosition =nPosition+nLastSpace
	  //graphics.drawString(s1, 2,(2+(nRowHeight*x)));
	  console.log(s1);
  }
}