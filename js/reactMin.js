//import $ from './common';
import $ from 'jquery';

//实例化组件有三种情况
function instanceReactComponent(node){
   //文本节点的情况
   if(typeof node === 'string' || typeof node === 'number'){
   	  return new ReactDomTextComponent(node)
   }
   //html标签节点的情况
   if(typeof node === 'object' && typeof node.type==='string'){
   	 return new ReactDomComponent(node)
   }
   //自定义组件的情况
   if(typeof node === 'object' && typeof node.type=='function'){
   	 return new ReactCompositeComponent(node)
   }

}

//第一种情况：文本节点，
//component类，用来表示文本在渲染。
function ReactDomTextComponent(text){
    //存下当前的字符串
    this._currentElement = `${text}`;
    //用来标志当前component
    this._rootNodeID=null;
}

ReactDomTextComponent.prototype.mountComponent=function(rootID){
	this._rootNodeID=rootID;
	return `<span data-reactid="${rootID}">${this._currentElement}</span>`;
}

ReactDomTextComponent.prototype.receiveComponent=function(nextText){
    var nextTextStr=nextText+'';
    //和以前保存的字符串进行对比
    if(nextTextStr!==this._currentElement){
    	this._currentElement=nextTextStr;
    	$('[data-reactid="' + this._rootNodeID + '"]').html(this._currentElement);
    }
}

//第二种情况html标签
function ReactDomComponent(element){
	//存下当前element对象
	console.log(element)
	this._currentElement=element;
	this._rootNodeID=null;
}
ReactDomComponent.prototype.mountComponent=function(rootID){
    this._rootNodeID=rootID;
    const props=this._currentElement.props;
    //这里先暂时只考虑会闭合的标签
    let tagOpen=`<${this._currentElement.type} data-reactid="${this._rootNodeID}"`;
    const  tagClose=`</${this._currentElement.type}>`;

    //属性处理
    for(let propKey in props){
    	//监听事件,分为前缀为on
    	if(/^on[A-Za-z]/.test(propKey)){
    		const eventType=propKey.replace('on','').toLowerCase();
            $(document).delegate('[data-reactid="' + this._rootNodeID + '"]', eventType + '.' + this._rootNodeID, props[propKey]);
    	}
        //将事件之外的属性添加到进去
        if(props[propKey] && propKey!='children' && !/^on[A-Za-z]/.test(propKey)){
        	tagOpen+=` ${propKey}=${props[propKey]}`
        }
    	
    }

    //children处理，将子节点内容加进去
    let content='';
    const children=props.children || [];
    const that=this;
    const childrenInstances=[] //用于保存所有子节点的component实例

    children.forEach((item,index)=>{
       const childrenComponentInstance=instanceReactComponent(item);
       childrenComponentInstance._mountIndex=index;
       childrenInstances.push(childrenComponentInstance);

       //子节点的rootId值是父节点的rootId值拼接上index拼成的新值
       const curRootId=that._rootNodeID+'.'+index;
       //获得子节点的渲染内容
       const childMarkup=childrenComponentInstance.mountComponent(curRootId);
       content += ` ${childMarkup}`;

    })

    //子节点component实例数组
    that._renderedChildren=childrenInstances;

    
    switch(this._currentElement.type){
        case 'input':
          return `${tagOpen} value="${content}"/>`
    }
    //完成闭合
    return `${tagOpen}>${content}${tagClose}`

}

ReactDomComponent.prototype.receiveComponent=function(nextElement){
     const lastProps=this._currentElement.props;
     const nextProps=nextElement.props;
     
     this._currentElement=nextElement;
     //单独更新属性
     this._updateDOMProperties(lastProps,nextProps);
     //再更新子节点
     this._updateDOMChildren(nextElement.props.children);
}

ReactDomComponent.prototype._updateDOMProperties=function(lastProps,nextProps){
	//两种情况
    //删除nextprops没有的
	for(let propKey in lastProps){
		if(nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)){
          continue;
		}
		//移除事件监听
		if(/^on[A-Za-z]/.test(propKey)){
			const eventType=propKey.replace('on','');
            $(document).delegate(`[data-reactid="${this._rootNodeID}"]`, eventType + '.' + this._rootNodeID, props[propKey])
		}
		//从dom上删除不需要的属性
		$('[data-reactid="' + this._rootNodeID + '"]').removeAttr(propKey)
	}
    //添加lastporps没有的
    for(let propKey in nextProps){
    	//添加事件，有的要移除
        const eventType=propKey.replace('on','');

        if(propKey=='children')continue;

         $('[data-reactid="' + this._rootNodeID + '"]').prop(propKey, nextProps[propKey])
        
    }
}

//子节点的更新
//全局的更新深度标识
let updateDepth=0;
//全局的更新队列
let diffQueue=[];

ReactDomComponent.prototype._updateDOMChildren =function(nextChildrenElement){
    updateDepth++;
    //diff用来递归找出差别，组装差异对象，添加到更新队列diffQueque
    this._diff(diffQueue,nextChildrenElement);
    updateDepth--;

    if(updateDepth===0){
    	//在需要的时候调用patch，将对象渲染到dom节点上
    	this._patch(diffQueue);
    	diffQueue=[];
    }
}
//子组件差异更新的几种类型
const UPDATE_TYPES={
	MOVE_EXISTING:1,
	REMOVE_NODE:2,
	INSERT_MARKUP:3
}

ReactDomComponent.prototype._diff=function(diffQueue,nextChildrenElements){
   const self=this;
   //拿到之前的子节点的component实例的数组，换成对象形式
   const  prevChildren=mapChildren(self._renderedChildren);
   //生成component对象数组换成对象形式
   const nextChildren=mapChildrenComponent(prevChildren,nextChildrenElements);

   //重新赋值_renderedChildren,使用最新的
   self._renderedChildren=[];
   for(let key in nextChildren){
   	self._renderedChildren.push(nextChildren[key])
   }
   let nextIndex=0;
   let lastIndex=0; //代表最后一次老的集合的位置

   //通过比较两个集合的差异，组装差异节点添加到队列中
   for(let name in nextChildren){
   	 if(!nextChildren.hasOwnProperty(name))continue;

   	 const prevChild=prevChildren && prevChildren[name];
   	 const nextChild=nextChildren[name];
   	 //相同的话我们使用同一个component，所以我们需要做移动的操作
   	 if(prevChild===nextChild){
   	 	//添加差异对象，类型：MOVE_EXSTING
   	 	prevChild._mountIndex<lastIndex && diffQueue.push({
   	 		parentId:self._rootNodeID,
   	 		parentNode: $('[data-reactid=' + self._rootNodeID + ']'),
   	 		type:UPDATE_TYPES.REMOVE_EXISTING,
   	 		fromIndex:prevChild._mountIndex,
   	 		toIndex:null
   	 	})
   	 	lastIndex=Math.max(prevChild._mountIndex,lastIndex)
   	 }else{//如果不相同说明是新增加的节点
   	 	//但是如果老的还存在，就是element不同，但是component一样，把老的element删除
   	 	if(prevChild){
   	 		//添加差异对象
   	 		diffQueue.push({
   	 			parentId:self._rootNodeID,
   	 			parentNode: $('[data-reactid=' + self._rootNodeID + ']'),
   	 			type:UPDATE_TYPES.REMOVE_NODE,
   	 			fromIndex:prevChild._mountIndex,
   	 			toIndex:null
   	 		})
   	 		lastIndex=Math.max(prevChild._mountIndex,lastIndex)
   	 		//如果以前已经渲染过，那要先去掉以前的事件监听
   	 		if (prevChild._rootNodeID) {
	            $(document).undelegate('.' + prevChild._rootNodeID);
	        }
           
   	 	}

   	 	//新增加的节点，也组装差异对象放到队列里
   	 	diffQueue.push({
   	 		parentId:self._rootNodeID,
   	 		parentNode:$('[data-reactid=' + self._rootNodeID + ']'),
   	 		type:UPDATE_TYPES.INSERT_MARKUP,
   	 		fromIndex:null,
   	 		toIndex:nextIndex,
   	 		markup:nextChild.mountComponent() //新增的节点，多一个此属性，表示dom内容
   	 	})
   	 }
   	 //更新mount的index
   	 nextChild._mountIndex=nextIndex;
   	 nextIndex++;
   }
   //对于老节点有的，新节点没有的，全部删掉
   for(let name in prevChildren){
     const prevChild=prevChildren && prevChildren[name];
     const nextChild=nextChildren[name];
   	if(prevChildren.hasOwnProperty(name) && !(nextChildren && nextChildren.hasOwnProperty(name))){
   		//添加差异对象，类型：REMOVE_NODE
   		diffQueue.push({ 
   			parentId:self._rootNodeID,
   			parentNode:$('[data-reactid=' + self._rootNodeID + ']'),
   			type:UPDATE_TYPES.REMOVE_NODE,
   			fromIndex:prevChild.mountIndex,
   			toIndex:null
   		})
        //如果已经渲染过了，去掉以前的监听事件
        if (prevChildren[name]._rootNodeID) {
	        $(document).undelegate('.' + prevChildren[name]._rootNodeID);
	      }
   	}
   }

}
//mapChildren,此方法用于将children数组转换成对象,键为它的key
function mapChildren(componentChildren){
   let child,name;
   let childrenMap={};
   componentChildren.forEach((item,index)=>{
   	child=item;
   	name=child && child._currentElement && child._currentElement.key 
   	?  child._currentElement.key : index.toString(36);
   	childrenMap[name]=child;
   })
   return childrenMap;
}
//用于生成子代elements的component集合
function mapChildrenComponent(prevChildren,nextChildrenElements){
	const nextChildren={};
	nextChildrenElements=nextChildrenElements || [];
	nextChildrenElements.forEach((element,index)=>{
       const name=element.key ? element.key : index;
       const prevChild=prevChildren && prevChildren[name];
       const prevElement=prevChild && prevChild._currentElement;
       const nextElement=element;

       //调用_shouldUpdateReactComponent判断是否更新
       if(_shouldUpdateReactComponent(prevElement,nextElement)){
       	 prevChild.receiveComponent(nextElement);
       	 nextChildren[name]=prevChild;
       }else{
         //对于没有老的就重新新增一个，重新生成一个
         const nextChildInstance=instanceReactComponent(nextElement,null);
         //使用新的component
         nextChildren[name]=nextChildInstance;
       }
	});

    return nextChildren;
}


//_patch函数
ReactDomComponent.prototype._patch=function(updates){
   let update;
   const initialChildren={};
   const deleteChildrn=[];
   updates.forEach((item,index)=>{
   	update=item;
   	if(update.type===UPDATE_TYPES.MOVE_EXISTING || update.type===UPDATE_TYPES.REMOVE_NODE){
   		const updateIndex=update.fromIndex;
   		const updateChild=$(update.parentNode.children().get(updateIndex));
   		const parentId=update.parentId;

   		//所有需要更新的节点保存下来，方便后面使用
        initialChildren[parentId]=initialChildren[parentId] || [];
        //使用parentId作为命名空间
        initialChildren[parentId][updateIndex]=updateChild;

        //所有需要修改的节点先删除，对于move的后面重新插入到正确位置即可
        deleteChildrn.push(updateChild);
   	}
   })

   //删除所有需要删除的
   deleteChildrn.forEach((item,index)=>{
   	 $(item).remove();
   })

   //然后将新增的节点和修改的节点重新插入
   updates.forEach((item,index)=>{
   	update=item;
   	switch(update.type){
       case UPDATE_TYPES.INSERT_MARKUP:
          insertChildAt(update.parentNode, $(update.markup), update.toIndex);
          break;
       case UPDATE_TYPES.MOVE_EXISTING:
           insertChildAt(update.parentNode, initialChildren[update.parentID][update.fromIndex], update.toIndex);
          break;
       case UPDATE_TYPES.REMOVE_NODE:
          break;
   	}
   })
}


//第三种情况
function ReactCompositeComponent(element){
	console.log(element)
	//存放元素element对象
	this._currentElement=element;
	this._rootNodeID=null;
    //存放ReactClass的实例
	this._instance=null;
}
ReactCompositeComponent.prototype.mountComponent=function(rootID){
    this._rootNodeID=rootID;
    const publicProps=this._currentElement.props;
    const ReactClass=this._currentElement.type;
    const inst=new ReactClass(publicProps);
    this._instance=inst;
    //保存当前component的引用，setState更新的时候会用到
    inst._reactInternalInstance=this;

    if(inst.componentWillMount){
    	inst.componentWillMount();
    }

    //调用ReactClass里的render方法，返回的是一个element或者文本节点
    const renderElement=this._instance.render();
    const renderComponentInstance=instanceReactComponent(renderElement);
    this._renderComponent=renderComponentInstance; //保存旧实例存做后用
    const renderMarup=renderComponentInstance.mountComponent(this._rootNodeID);
    mountReady(inst.componentDidMount)
    return renderMarup;

}
//更新
ReactCompositeComponent.prototype.receiveComponent=function(nextElement,newState){
    //如果接受了新的，就还是最新的element
    this._currentElement=nextElement || this._currentElement;

    const inst=this._instance;

    //改写inst.state;
    const nextState=$.extend(inst.state,newState);
    this.state=newState;
    const nextProps= this._currentElement.props;

    //组件是否需要更新
    if(inst.shouldComponentUpdate && inst.shouldComponentUpdate(nextProps,nextState)===false){
    	return
    }

    //生命周期管理，如果有componentWillUpdate,就调用，表示开始更新了
    if(inst.componentWillUpdate){
    	inst.componentWillUpdate(nextProps,nextState);
    }
    
    //拿旧的实例获取element
    const prevComponentInstance=this._renderComponent;
    const prevRenderElement=prevComponentInstance._currentElement;
    //重新执行render拿到对应的element
    const nextRenderElement=this._instance.render();

    //判断是需要更新还是重新渲染
    if(_shouldUpdateReactComponent(prevRenderElement,nextRenderElement)){
    	prevComponentInstance.receiveComponent(nextRenderElement)
    	//调用ComponentDidUpdate
    	inst.componentDidUpdate && inst.componentDidUpdate();
    }else{
        //如果发现完全不同的两个Element。那就直接重新渲染了
        const thisID=this._rootNodeID;
        //这里的this._reactInternalInstance是component在mountComponent里存的
        this._renderComponent=this._reactInternalInstance(nextRenderElement)
        const nextMarkup=this._renderComponent.mountComponent(thisID);
        //替换节点
        $('[data-reactid="' + this._rootNodeID + '"]').replaceWith(nextMarkup);
    }
}
/*
createElememt的实现
  reactElement就是虚拟dom的概念，具有一个type属性代表当前的节点类型，
  还有节点的属性props，比如对于div这样的节点type，props就是attributes
  另外key是用来标志这个节点
*/
function ReactElement(type,key,props){
   this.key=key;
   this.type=type;
   this.props=props;
}


/*createClass的实现*/
//定义ReactClass，所有自定义超级父类
function ReactClass(){

}

ReactClass.prototype.render=function(){

}
//setState
ReactClass.prototype.setState=function(newState){
   //在ReactCompositeComponent里面做了赋值
   this._reactInternalInstance.receiveComponent(null,newState)
}




const React={
  nextReactRootIndex:0,
  render:function(element,contain){
     var instanceComponent=instanceReactComponent(element);
     var markup=instanceComponent.mountComponent(this.nextReactRootIndex++);
     console.log(markup)
     contain.innerHTML=markup;

     //触发mount事件
     mountReady();
  },
  createElement:function(type,config,children){
      const props={};
      config=config || {}; //容错处理
      const key=config.key || null;

      //将config复制到props里
      for(let propName in config){
      	if(config.hasOwnProperty(propName) && propName!=='key'){
      		props[propName]=config[propName];
      	}
      }

      //处理children，将chilren挂载到props上
      const childrenLength=arguments.length-2;
      if(childrenLength===1){
      	props.children=Array.isArray(children) ? children : [children];
      }else if(childrenLength>1){
      	const childArr=Array(childrenLength);
      	childArr.forEach((item,index)=>{
      		item=arguments[index+2]
      	});
      	props.children=childArr;
      }

      return new ReactElement(type,key,props)
  },
  createClass:function(spec){
  	  const Constructor=function Constructor(props){
  	  	 this.props=props;
         this.state=this.getInitialState ? this.getInitialState() : null;
  	  }

  	  Constructor.prototype=new ReactClass();
  	  Constructor.prototype.constructor=Constructor;
      $.extend(Constructor.prototype,spec)
      return Constructor;
  }

}
//渲染完成执行
function mountReady(fn){
   if(fn)fn();
}
/*用于判断两个element需不需要更新
这里考虑key，如果key相同则返回true更新如果key不同则返回false，也就是更新部分和替换
*/
function _shouldUpdateReactComponent(prevElement,nextElement){
   if(prevElement != null && nextElement !=null){
   	  const prevType=typeof prevElement;
   	  const nextType=typeof nextElement;
   	  if(prevType === 'string' || prevType==='number'){
   	  	return nextType=== 'string' || nextType==='number'
   	  }else{
   	  	return nextType === 'object' && prevElement.type === nextElement.type && 
   	  	prevElement.key === nextElement.key;
   	  }
   }
   return false;
}
//用于将childNode插入到指定位置
function insertChildAt(parentNode, childNode, index) {
    var beforeChild = parentNode.children().get(index);
    beforeChild ? childNode.insertBefore(beforeChild) : childNode.appendTo(parentNode);
}

export default React;