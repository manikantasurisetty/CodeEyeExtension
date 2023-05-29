/**
 * Code host platforms
 */
const codeHostPlatforms = {
    hostList: ['bitbucket.org', 'github.com'],
    isBitBucketHost: location.hostname === 'bitbucket.org',
    isGitHubHost: location.hostname === 'github.com',
};

/**
 * Check whether current host supported to fetch suggestions or not
 * @returns {Boolean}
 */
const isHostSupported = () => {
    return codeHostPlatforms.hostList.includes(location.hostname);
};

/**
 * Remove Suggestions list from DOM object
 * @param {HTMLDivElement} clickWrapper
 * @returns {void}
 */
const removeDropdownElement = (clickWrapper) => {
    clickWrapper.querySelector('.searchResultsList').remove();
};

//create IntersectionObserver
let options = {
    threshold: [
        0, 0.001, 0.002, 0.005, 0.01, 0.05, 0.15, 0.25, 0.35, 0.5, 0.75, 0.9,
        0.99, 1,
    ],
};

/**
 * Remove Suggestions list from DOM object
 * @param {HTMLDivElement} suggestionsList
 * @returns {void}
 */
const handleSuggestionsList = (payload) => {
    const resultsDropdown = document.querySelector('.searchResultsList');
    if (resultsDropdown) {
        console.log('TOD - Needs to handle the visiblity of results dropdown Visiblity on scroll of the page');
    }
};

// create Observer to handle suggestions dropdown
const suggestionsList = new IntersectionObserver(
    handleSuggestionsList,
    options
);
/**
 * returns the index of search keyword
 * @param {HTMLDivElement} textEditorDivElement
 * @returns {Number}
 */
const getIndexOfCommentElement = (textEditorDivElement) => {
    const activeNodeValue = window.getSelection().focusNode.nodeValue;
    const currentNodeValue = activeNodeValue ? activeNodeValue.toString() : '';
    return Array.from(textEditorDivElement.children).findIndex(
        (x) => x.innerHTML == currentNodeValue
    );
};

/**
 * Render populated suggestions
 * @param {HTMLElement} parentRichTextEditorId
 * @param {Number} currentCommentIndex
 * @returns {HTMLUListElement}
 */
const generatePopulatedElement = (
    parentRichTextEditorId,
    currentCommentIndex
) => {
    const isBitBucketHost = codeHostPlatforms.isBitBucketHost;
    const isGitHubHost = codeHostPlatforms.isGitHubHost;
    const getExistingDropdownElement =
        document.querySelector('#searchResultsList');
    if (getExistingDropdownElement) getExistingDropdownElement.outerHTML = '';
    const ul = document.createElement('ul');
    ul.setAttribute('id', 'searchResultsList');
    ul.setAttribute('class', 'searchResultsList');
    if (isBitBucketHost) {
        parentRichTextEditorId.append(ul);
    } else if (isGitHubHost) {
        parentRichTextEditorId.closest('.js-write-bucket').append(ul);
    }

    let commentInput = isBitBucketHost
        ? document.querySelector('.ua-chrome.ProseMirror')
        : parentRichTextEditorId;

    const commentInputHeight = commentInput.getBoundingClientRect().height;
    const dropdownTopPosition = isBitBucketHost
        ? commentInputHeight + 32 + 23 + 'px'
        : 50 + 'px';

    const styles = {
        top: dropdownTopPosition,
    };

    Object.assign(ul.style, styles);
    chrome.storage.sync.set(
        {
            editorNodeDetails: {
                currentCommentIndex: currentCommentIndex,
                parentRichTextEditorId: parentRichTextEditorId,
            },
        },
        function () {}
    );

    ul.setAttribute('class', 'searchResultsList');
    return ul;
};

/**
 * Fetch and Display suggestions
 * @param {String} searchKeyword
 * @param {HTMlDivElement} clickWrapper
 * @param {Number} currentCommentIndex
 * @returns {void}
 */
const getCommentDetailsFromServer = (
    searchKeyword,
    clickWrapper,
    currentCommentIndex
) => {
    fetch(`http://localhost:8080/commentsDictionary/search/${searchKeyword}`)
        .then((response) => {
            if (response.status !== 200) {
                console.log(
                    'Looks like there was a problem. Status Code: ' +
                        response.status
                );
                return;
            }

            // Examine the text in the response
            response.json().then(function (data) {
                let commentsList = data.commentsDictionary;
                if (commentsList.length > 0) {
                    const ul = generatePopulatedElement(
                        clickWrapper,
                        currentCommentIndex
                    );
                    commentsList.forEach((element, index, arr) => {
                        var li = document.createElement('li');
                        li.innerHTML += element.comments;
                        li.setAttribute('class', 'item');
                        ul.setAttribute('class', 'searchResultsList');
                        ul.appendChild(li);
                        ul.querySelector('li').classList.add('active');
                    });

                    const watch = document
                        .querySelector('.searchResultsList')
                        .closest('.inline-content-wrapper');
                    suggestionsList.observe(watch);
                }
            });
        })
        .catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
};

/**
 * Get Bitbucket Click wrapper
 * @param {Object} event
 */
const getBitBucketCommentIntellisense = (event) => {
    const { target } = event;
    const isSupportedHost =
        target.className.includes('ProseMirror') ||
        target.getAttribute('name') === 'comment[body]';
    const isBitBucketHostRepo = codeHostPlatforms.isBitBucketHost;
    if (isSupportedHost && isBitBucketHostRepo) {
        const clickWrapper = target.closest('[data-testid="click-wrapper"]');
        let currentCommentIndex = getIndexOfCommentElement(target);
        if (currentCommentIndex >= 0) {
            const commentInputPlaceholder =
                target.children[currentCommentIndex];
            if (
                commentInputPlaceholder.innerHTML.length > 0 &&
                commentInputPlaceholder.innerHTML[0] == '#'
            ) {
                const searchKeyword = commentInputPlaceholder.innerHTML
                    .toString()
                    .substr(1);
                searchKeyword
                    ? getCommentDetailsFromServer(
                          searchKeyword,
                          clickWrapper,
                          currentCommentIndex
                      )
                    : removeDropdownElement(clickWrapper);
            }
        }
    } else if (isSupportedHost && codeHostPlatforms.isGitHubHost) {
        const searchInputValue =
            target.value.length > 0 ? target.value.trim() : '';
        if (searchInputValue && searchInputValue.startsWith('#')) {
            searchInputValue
                ? getCommentDetailsFromServer(
                      searchInputValue.toString().substr(1),
                      target
                  )
                : removeDropdownElement(clickWrapper);
        }
    }
};

/**
 * Get Github Click wrapper
 * @param {Object} event javascript click event
 */
const getGithubSuggestionsList = (event) => {
    getBitBucketCommentIntellisense(event);
};

/**
 *
 * @param {Object} event
 * @param {String} hostname
 * @returns {void}
 */
const getCodeHostSuggestions = (event, hostname) => {
    switch (hostname) {
        case 'bitbucket.org':
            getBitBucketCommentIntellisense(event);
        case 'github.com':
            getGithubSuggestionsList(event);
        default:
            console.log('host is not supported to get suggestions');
    }
};

/**
 * Handle key event
 * @param {Object} event keyup event
 */
const handleKeyupEvent = (event) => {
    const { key } = event;
    if (isHostSupported() && key !== 'ArrowUp' && key !== 'ArrowDown') {
        getCodeHostSuggestions(event, location.hostname);
    }
};

/**
 * Replace previous content
 * @param {Number} currentCommentIndex
 * @param {String} result
 */
const replaceoriginalElementWithReturnedContent = (
    currentCommentIndex,
    result,
    isGitHubHost
) => {
    if (!isGitHubHost) {
        const editorElement = document.querySelectorAll('.ProseMirror')[0];
        const newChildElement = document.createElement('p');
        newChildElement.innerHTML = result;
        const childElementToUpdate =
            editorElement.children[currentCommentIndex];
        editorElement.removeChild(childElementToUpdate);
        editorElement.insertBefore(
            newChildElement,
            editorElement.children[currentCommentIndex]
        );
    }
};

/**
 * Update Input with active list item in bitbucket
 * @param {HTMLUListElement} clickWrapper
 */
const updateBitbucketInputWithSelection = (clickWrapper) => {
    if (clickWrapper) {
        const listArray = clickWrapper.querySelector('.searchResultsList');
        const activeListitem = listArray?listArray.querySelector('.active'):'';
        chrome.storage.sync.get(
            /* String or Array */ ['editorNodeDetails'],
            (items) => {
                replaceoriginalElementWithReturnedContent(
                    1,
                    activeListitem?activeListitem.innerHTML:''
                );
                if (listArray) {
                    listArray.remove();
                }
            }
        );
    }
};

/**
 * Update Input with active list item
 * @param {HTMLUListElement} clickWrapper
 */
const updateGitHubInputWithSelection = (clickWrapper) => {
    if (clickWrapper) {
        const listArray = clickWrapper.querySelector('.searchResultsList');
        const activeListitem = listArray?listArray.querySelector('.active'):'';
        const textAreaInput = clickWrapper.querySelector(
            'textarea[name="comment[body]"]'
        );
        if (textAreaInput) {
            textAreaInput.value = textAreaInput ? activeListitem.innerHTML : '';
        }
        if (listArray) {
            listArray.remove();
        }
    }
};

/**
 * get current Index list item
 * @param {HTMLUListElement} list
 * @returns {Number}
 */
const getActiveListItem = (list) => {
    if (!list) {
        return;
    }
    const activeListitem = list.querySelector('.active');
    const listArray = Array.prototype.slice.call(list.children);
    return listArray.indexOf(activeListitem);
};

/**
 * remove active class from all list items
 * @returns {void}
 */
const resetActiveListItem = () => {
    const list = document.querySelector('.searchResultsList');
    if (list) {
        const activeListitem = list.querySelector('.active');
        const listArray = Array.prototype.slice.call(list.children);
        const activeIndex = listArray.indexOf(activeListitem);
        listArray[activeIndex].classList.remove('active');
    }
};

/**
 * Check Arrow keys and highlight the selection in list
 * @param {Object} e keydown event
 */
const handleKeydownEvent = (e) => {
    const { key, target } = e;
    const clickWrapper = codeHostPlatforms.isGitHubHost
        ? target.closest('.js-write-bucket')
        : target.closest('[data-testid="click-wrapper"]');
    if (clickWrapper) {
        const list = codeHostPlatforms.isGitHubHost
            ? clickWrapper.querySelector('.searchResultsList')
            : document.querySelector('.searchResultsList');
        let activeIndex = getActiveListItem(list);
        const listItems = list ? Array.prototype.slice.call(list.children) : [];
        if (listItems && listItems.length) {
            if (key === 'ArrowDown') {
                if (activeIndex < list.children.length - 1) {
                    resetActiveListItem();
                    activeIndex += 1;
                    listItems[activeIndex].classList.add('active');
                }
            } else if (key === 'ArrowUp') {
                if (activeIndex > 0) {
                    resetActiveListItem();
                    activeIndex -= 1;
                    listItems[activeIndex].classList.add('active');
                }
            } else if (key === 'Enter') {
                if (activeIndex && codeHostPlatforms.isGitHubHost) {
                    updateGitHubInputWithSelection(clickWrapper);
                } else if (activeIndex && codeHostPlatforms.isBitBucketHost) {
                    updateBitbucketInputWithSelection(clickWrapper);
                }
            }
        }
    }

    e.stopPropagation();
};

/**
 * Handle click event on click wrapper
 * @param {Object} event Javascript click event
 * @returns {void}
 */
const handleClickEvent = (event) => {
    const isBitBucketHost = codeHostPlatforms.isBitBucketHost;
    const isGitHubHost = codeHostPlatforms.isGitHubHost;
    if (isBitBucketHost && event.target.classList.contains('item')) {
        chrome.storage.sync.get(
            /* String or Array */ ['editorNodeDetails'],
            (items) => {
                replaceoriginalElementWithReturnedContent(
                    items.editorNodeDetails.currentCommentIndex,
                    event.target.innerHTML
                );
                removeDropdownElement(event.target.parentElement.parentElement);
            }
        );
    } else if (isGitHubHost) {
        const writeBucket = event.target.closest('.js-write-bucket');
        if (writeBucket) {
            updateGitHubInputWithSelection(writeBucket);
        }
    }
};

document.body.addEventListener('keyup', handleKeyupEvent);
document.body.addEventListener('click', handleClickEvent);
document.addEventListener('keydown', handleKeydownEvent);
