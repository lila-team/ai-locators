/* eslint-disable no-unexpected-multiline */
/* eslint-disable no-unused-expressions */
{
    // Constants
    LLM_API_URL: '<PLACEHOLDER>',
    LLM_MODEL: '<PLACEHOLDER>',
    LLM_API_KEY: '<PLACEHOLDER>',  // Will be replaced at runtime
    
    // Store failed suggestions per root+description combination
    _failedSuggestions: {},

    // Store successful suggestions per root+description combination
    _successfulSuggestions: {},

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

    // Helper function to get a unique key for root+description combination
    _getKey(content, description) {
        return `${content}:::${description}`;
    },

    // Helper function to record a failed suggestion
    _recordFailedSuggestion(content, description, selector) {
        const key = this._getKey(content, description);
        if (!this._failedSuggestions[key]) {
            this._failedSuggestions[key] = new Set();
        }
        this._failedSuggestions[key].add(selector);
    },

    // Helper function to record a successful suggestion
    _recordSuccessfulSuggestion(content, description, selector) {
        const key = this._getKey(content, description);
        if (!this._successfulSuggestions[key]) {
            this._successfulSuggestions[key] = new Set();
        }
        this._successfulSuggestions[key].add(selector);
    },

    // Helper function to get failed suggestions
    _getFailedSuggestions(content, description) {
        const key = this._getKey(content, description);
        return Array.from(this._failedSuggestions[key] || []);
    },

    _getSuccessfulSuggestions(content, description) {
        const key = this._getKey(content, description);
        return Array.from(this._successfulSuggestions[key] || []);
    },

    // Helper function to generate messages for the LLM
    _getMessages(description, content) {
        const failedSuggestions = this._getFailedSuggestions(content, description);
        
        const messages = [{
            role: 'user',
            content: `
            You are an assistant that generates a single CSS selector based on an HTML and a description:

            The description could be about a specific element or a group of elements. For example:
            * "The main heading of the page"  # This is a specific element
            * "The login button"  # This is a specific element
            * "The product images"  # This is a group of elements
            * "The navigation links"  # This is a group of elements

            To generate the CSS selector, apply the following rules depending on the the description:

            * For input elements, follow these rules:
                1) If the element has an id attribute, return it as the selector. This is the most specific selector.
                   For example: '#username-input'
                2) If not, look for a unique name attribute and return it.
                   For example: 'input[name="username"]'
                3) If not, check if the element has a unique placeholder attribute and return it.
                   For example: 'input[placeholder="Enter your username"]'
                4) If not, check if a unique data attribute, return it.
                   For example: 'input[data-qa="username"]'
                5) If not, check if a unique aria-* attribute, return it.
                   For example: 'input[aria-label="Username"]'
                6) If not, check if there is a unique class attribute and return it.
                   For example: '.username-input'
                7) If not, check if there is a unique role attribute and return it.
                   For example: '[role="textbox"]'
                8) Lastly fallback to the tag name and its parent's tag name to create a selector.
                   Use nth-child or nth-of-type to make the selector more specific.
                   For example: 'form input:nth-of-type(1)'
                9) If you still cannot generate the selector, output 'NULL'.

            * For interactive elements (such as buttons, links, etc), follow these rules:
                1) If the element has an id attribute, return it as the selector. This is the most specific selector.
                   For example: '#submit-button'
                2) If the element has a unique data attribute, return it.
                   For example: '[data-qa="submit-button"]'
                3) If the element has a unique aria-* attribute, return it.
                   For example: '[aria-label="Submit"]'
                4) If the element class can be used to identify it, return it.
                   For example: '.submit-button' or 'div .submit-button'
                5) If the element has a unique role attribute, return it.
                   For example: '[role="button"]'
                6) If the element has a unique text content, return it.
                   For example: 'button:contains("Submit")'
                7) Lastly fallback to the tag name and its parent's tag name to create a selector.
                   Use nth-child or nth-of-type to make the selector more specific.
                   For example: 'form button:nth-of-type(1)'
                8) If you still cannot generate the selector, output 'NULL'.

            * For content elements (headings, paragraphs, etc), follow these rules:
                1) If the element has an id attribute, return it as the selector. This is the most specific selector.
                   For example: '#main-heading'
                2) If the element has a unique data attribute, return it.
                   For example: '[data-qa="main-heading"]'
                3) If the element has a unique aria-* attribute, return it.
                   For example: '[aria-label="Main Heading"]'
                4) If the element has a unique class attribute, return it.
                   For example: '.main-heading'
                5) If the element has a unique role attribute, return it.
                   For example: '[role="heading"]'
                6) If the element has a unique text content, return it.
                   For example: 'h1:contains("Main Heading")'
                7) Lastly fallback to the tag name and its parent's tag name to create a selector.
                   For example: 'section h1:nth-of-type(1)'
                8) If you still cannot generate the selector, output 'NULL'.

             * For descriptions that are meant to aggregate multiple elements, follow these rules:
                1) If the elements have a unique class attribute, return it.
                   For example: '.product-image'
                2) If the elements have a unique data attribute, return it.
                   For example: '[data-qa="product-image"]'
                3) If the elements have a unique aria-* attribute, return it.
                   For example: '[aria-label="Product Image"]'
                4) If the elements have a unique role attribute, return it.
                   For example: '[role="img"]'
                5) Lastly fallback to the tag name of the elements and the parent's selector to create a selector.
                   For example: '#product-list img'
                6) If you still cannot generate the selector, output 'NULL'.

            In any case:
            * Do not invent new attributes or classes.
            * If the selector is not unique, use nth-child or nth-of-type to make it more specific.
            * Do not prepend tags or parent selectors to the selector if they are not necessary.
                * If 'name' is unique, use 'input[name="username"]' instead of '.main form input[name="username"]'.

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
        }];

        // Add failed suggestions as separate messages in the conversation
        if (failedSuggestions.length > 0) {
            messages.push({
                role: 'assistant',
                content: failedSuggestions[0]
            });
            messages.push({
                role: 'user',
                content: 'That selector did not work. Please try a different approach.'
            });
            
            // Add remaining failed suggestions as alternating assistant/user messages
            for (let i = 1; i < failedSuggestions.length; i++) {
                messages.push({
                    role: 'assistant',
                    content: failedSuggestions[i]
                });
                messages.push({
                    role: 'user',
                    content: 'That selector also did not work. Please try a different approach.'
                });
            }
            console.log('Failed suggestions:', failedSuggestions);
        }

        // Add the final assistant message
        messages.push({
            role: 'assistant',
            content: 'The generated selector is:'
        });

        return messages;
    },

    // Helper function to make sync HTTP request to LLM
    _llm(messages) {
        // Check if we have any successful suggestions first
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
                if (!llm_selector || llm_selector === 'NULL') {
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

            // Check if we have any successful suggestions first
            const successfulSuggestions = this._getSuccessfulSuggestions(content, selector);
            if (successfulSuggestions.length > 0) {
                console.log('Using cached successful selector:', successfulSuggestions[0]);
                return successfulSuggestions[0];
            }
            
            // Get selectors from LLM
            const messages = this._getMessages(selector, content);
            const llm_selector = this._llm(messages);

            if (!llm_selector || llm_selector === 'NULL') {
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
                    this._recordSuccessfulSuggestion(content, selector, llm_selector);
                    return element;
                }
                console.log('No element found with selector:', llm_selector);
                // Record the failed suggestion
                this._recordFailedSuggestion(content, selector, llm_selector);
                return null;
            } catch (e) {
                console.error('Error with selector:', llm_selector, e);
                // Record the failed suggestion
                this._recordFailedSuggestion(content, selector, llm_selector);
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
            const elem = root.documentElement ? root.documentElement.querySelector('body') : root;
            const content = this._cleanup(elem).getHTML();

            // Check if we have any successful suggestions first
            const successfulSuggestions = this._getSuccessfulSuggestions(content, selector);
            if (successfulSuggestions.length > 0) {
                console.log('Using cached successful selector:', successfulSuggestions[0]);
                this._recordSuccessfulSuggestion(content, selector, successfulSuggestions[0]);
                return successfulSuggestions[0];
            }
            
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
                } else {
                    console.log('No elements found with selector:', llm_selector);
                    // Record the failed suggestion
                    this._recordFailedSuggestion(content, selector, llm_selector);
                }
                return Array.from(elements);
            } catch (e) {
                console.error('Error with selector:', llm_selector, e);
                // Record the failed suggestion
                this._recordFailedSuggestion(content, selector, llm_selector);
                return [];
            }
        } catch (e) {
            console.error('Error in queryAll:', e);
            return [];
        }
    }
}
