/* eslint-disable no-unexpected-multiline */
/* eslint-disable no-unused-expressions */
{
    // Constants
    LLM_API_URL: '<PLACEHOLDER>',
    LLM_MODEL: '<PLACEHOLDER>',
    LLM_API_KEY: '<PLACEHOLDER>',  // Will be replaced at runtime

    _cleanup(root) {
        console.log("Filtering non-relevant elements");
        var ret = this._filterNonRelevantElements(root);
        console.log("Removing comments");
        ret = this._removeComments(ret);
        console.log("Removing non-important attributes");
        ret = this._removeNonImportantAttributes(ret);
        return ret;
    },

    // Helper function to filter out non-relevant elements from the root
    _filterNonRelevantElements(root) {
        // Clone the root element to preserve the original
        const clonedRoot = root.cloneNode(true);
        console.log('Original length', root.getHTML().length);

        // Remove <script>, <style>, and <noscript> elements in the clone
        const unwantedTags = ['script', 'style', 'noscript', 'link', 'meta', 'iframe', 'object', 'embed'];

        unwantedTags.forEach(tag => {
            const elements = clonedRoot.querySelectorAll(tag);
            elements.forEach(element => element.remove());
        });

        console.log('Parsed length', clonedRoot.getHTML().length);
        return clonedRoot;
    },

    // Helper function to remove comments from the root
    _removeComments(root) {
        // Clone the root element to preserve the original
        const clonedRoot = root.cloneNode(true);
        console.log('Original length', root.getHTML().length);

        // Remove comments from the clone
        const comments = clonedRoot.querySelectorAll('*');
        comments.forEach(element => {
            if (element.nodeType === Node.COMMENT_NODE) {
                element.remove();
            }
        });

        console.log('Parsed length', clonedRoot.getHTML().length);
        return clonedRoot;
    },

    // Helper function to non important attributes
    _removeNonImportantAttributes(root) {
        // Clone the root element to preserve the original
        const clonedRoot = root.cloneNode(true);
        console.log('Original length', root.getHTML().length);

        // Remove non important attributes from the clone
        const importantAttributes = [
                'id',
                'class',
                'name',
                'data-*',
                'role',
                'type',
                'aria-*'
              
        ];

        // Remove all attributes except the important ones
        const elements = clonedRoot.querySelectorAll('*');
        elements.forEach(element => {
            const attributes = Array.from(element.attributes);
            attributes.forEach(attr => {
                if (!importantAttributes.some(ia => new RegExp(ia).test(attr.name))) {
                    element.removeAttribute(attr.name);
                }
            });
        });

        console.log('Parsed length', clonedRoot.getHTML().length);
        return clonedRoot;
    },

    // Helper function to generate messages for the LLM
    _getMessages(description, content) {
        return [{
            role: 'user',
            content: `
            You are an assistant that generates CSS selectors based on an HTML and a description of an element or elements.

            The description could be about a specific element or a group of elements. For example:
            * "The main heading of the page"  # This is a specific element
            * "The login button"  # This is a specific element
            * "The product images"  # This is a group of elements
            * "The navigation links"  # This is a group of elements

            You need to locate the element or elements and generate the most specific CSS selector for them.

            If the description is about a specific element, follow this guide:
            1) If the element has an id attribute, use it as the selector. This is the most specific selector.
            2) If the element has a class attribute instead, and it is unique, use it as the selector.
            3) If the element has a clear role instead, use that.
            3) If the element has unique data attribute instead, use that.
            4) If previous steps do not apply, use the element's tag name and its parent's tag name to create a selector. Use nth-child or nth-of-type to make the selector more specific.
            5) If you still cannot generate the selector, output 'NULL'.

            If the description is about a group of elements, follow this guide:
            1) If all elements share a unique class attribute, use it as the selector.
            2) If the elements share a common parent, use a parent's selector and the children's tag name to create a selector.
            3) If there is no way to group the elements, output 'NULL'.
            
            * The selector MUST NOT use the following CSS selectors: :has, :has-text, :text, :visible, :is or any non native CSS selector.
                * Instead, use nth-child, nth-of-type, first-child, last-child, etc. to locate elements by index

            <OUTPUT>
            You should output the selector or 'NULL' if no selector is found.
            Do not include any additional text, comments or instructions in the output.
            Do not quote your response with backticks or any other characters.

            Just output the selector string or 'NULL'.
            </OUTPUT>
            
            <INPUT>
            Description: ${description}
            
            Page content:
            <PAGE>
            ${content}
            </PAGE>

            </INPUT>`
        },{
            role: 'assistant',
            content: 'The generated selector is:'
        }];
    },

    // Helper function to make sync HTTP request to LLM
    _llm(messages) {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', this.LLM_API_URL, false);  // false makes it synchronous
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${this.LLM_API_KEY}`);
        
        const data = {
            model: this.LLM_MODEL,
            max_tokens: 50,
            messages,
            stream: false
        };
        
        try {
            xhr.send(JSON.stringify(data));
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                const llm_selector = response.choices[0].message.content.trim();
                if (!llm_selector) {
                    console.error('No selector generated:', response);
                    return null;
                }
                console.log('Generated selector:', llm_selector);
                return llm_selector;
            } else {
                console.error('API request failed:', xhr.status, xhr.responseText);
                return null;
            }
        } catch (e) {
            console.error('Error making API request:', e);
            return null;
        }
    },

    // Returns the first element matching given selector in the root's subtree.
    query(root, selector) {
        console.log('%c AI Selector: Starting query', 'background: #222; color: #bada55');
        console.log('Root:', root);
        console.log('Selector:', selector);
                
        try {       
            // Get the root content instead of entire DOM
            const elem = root.documentElement ? root.documentElement.querySelector('body') : root;
            const content = this._cleanup(elem).getHTML();
            
            // Get selectors from LLM
            const messages = this._getMessages(selector, content);
            const llm_selector = this._llm(messages);

            if (!llm_selector) {
                console.error('No selector generated');
                return null;
            }
            
            try {
                console.log('Trying selector:', llm_selector);
                const element = root.querySelector(llm_selector);
                if (element) {
                    console.log('%c Found element!', 'background: green; color: white', {
                        selector: llm_selector,
                        element: element
                    });
                    return element;
                }
                console.log('No element found with selector:', llm_selector);
                return null;
            } catch (e) {
                console.error('Error with selector:', llm_selector, e);
                return null;
            }
        } catch (e) {
            console.error('Error in query:', e);
            return null;
        }
    },

    // Returns all elements matching given selector in the root's subtree.
    queryAll(root, selector) {
        console.log('%c AI Selector: Starting queryAll', 'background: #222; color: #bada55');
        console.log('Root:', root);
        console.log('Selector:', selector);            
                
        try {            
            // Get the root content instead of entire DOM
            // If root is the document, fetch the body element
            // If root is an element, fetch the element itself
            const elem = root.documentElement ? root.documentElement.querySelector('body') : root;
            const content = this._cleanup(elem).getHTML();
            
            // Get selectors from LLM
            const messages = this._getMessages(selector, content);
            const llm_selector = this._llm(messages);
            
            const elements = new Set();
            try {
                console.log('Trying selector:', llm_selector);
                const found = root.querySelectorAll(llm_selector);
                if (found.length > 0) {
                    console.log('%c Found elements!', 'background: green; color: white', {
                        selector: llm_selector,
                        count: found.length
                    });
                    found.forEach(el => elements.add(el));
                }
                return Array.from(elements);
            } catch (e) {
                console.error('Error with selector:', llm_selector, e);
                return [];
            }
        } catch (e) {
            console.error('Error in queryAll:', e);
            return [];
        }
    }
}
