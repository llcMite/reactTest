//添加事件监听
function addEventHandle(dataid,eventType,fn,isAdd,removeAll){
	
	document.addEventListener(eventType,function(e){
		console.log(dataid,eventType,fn,isAdd,removeAll,e.target.getAttribute('data-reactid'))
		//if(e.target.getAttribute('data-reactid')==dataid && removeAll){return}
		if(e.target.getAttribute('data-reactid')==dataid && isAdd){			
			fn && fn();
	    }
	})
}

//替换节点
function replaceWith(dataid,newEle){
   const ele=document.querySelector(`[data-reactid="${dataid}"]`);
   ele.insertAdjacentHTML('beforeBegin',newEle);
   ele.parentNode.removeChild(ele)
}

//插入到指定节点
function insertChildAt(parentNode,childNode,targetNode){
   targetNode ? targetNode.insertAdjacentHTML('beforeBegin',childNode) 
   : parentNode.appendChild(childNode);
}

//获取react节点
function getElement(dateid){
  return document.querySelector(`[data-reactid="${dataid}"]`)
}
export default {
	addEventHandle:addEventHandle,
	replaceWith:replaceWith,
	getElement:getElement,
	insertChildAt:insertChildAt,
}