/*
 * Bu script ile sayfa büyütüldüğünde yatay scrool barı görünür hale getiriyoruz.
 * Sayfa küçültüldüğünde ise yatay scrool barı gizliyoruz.
*/
window.onresize = function () {
	var zoomLevel = window.devicePixelRatio;

	if (zoomLevel >= 3) 
	{
		document.body.style.overflow = "visible";
	} 
	else 
	{
		document.body.style.overflow = "hidden"; 
	}
};