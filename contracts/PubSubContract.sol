// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

contract PubSubContract {
    struct Topic {
        string name;
        string[] messages;
        address[] publishers;
        address[] subscribers;
        mapping(address => string[]) subscriberToMessages;
        mapping(address => uint) subscriberToBalance;
    }

    mapping(string => Topic) private topics;
    
    event MessageReceived(string topic, string message, address subscriber);

    function advertise(string memory _topicName) public {
        Topic storage topic = topics[_topicName];
        if (bytes(topic.name).length == 0) {
            topic.name = _topicName;
        }

        bool alreadyPublisher = false;
        for (uint i = 0; i < topic.publishers.length; i++) {
            if (topic.publishers[i] == msg.sender) {
                alreadyPublisher = true;
                break;
            }
        }

        if (!alreadyPublisher) {
            topic.publishers.push(msg.sender);
        }
    }

    function subscribe(string memory _topicName) public payable {
        require(bytes(topics[_topicName].name).length != 0, "Topic does not exist");
        require(msg.value == 0.5 ether, "Must send 0.5 ETH to subscribe");

        Topic storage topic = topics[_topicName];
        require(topic.subscriberToBalance[msg.sender] == 0, "Already subscribed to this topic");
        
        topic.subscribers.push(msg.sender);
        topic.subscriberToBalance[msg.sender] = msg.value;
    }

    function publish(string memory _topicName, string memory _message) public {
        Topic storage topic = topics[_topicName];
        require(bytes(topic.name).length != 0, "Topic does not exist");

        bool isPublisher = false;
        for (uint i = 0; i < topic.publishers.length; i++) {
            if (topic.publishers[i] == msg.sender) {
                isPublisher = true;
                break;
            }
        }

        require(isPublisher, "Caller is not a publisher of this topic");

        topic.messages.push(_message);

        for (uint i = 0; i < topic.subscribers.length; ) {
            address subscriber = topic.subscribers[i];
            uint balance = topic.subscriberToBalance[subscriber];

            if (balance > 0) {
                if (balance >= 0.005 ether) {
                    topic.subscriberToBalance[subscriber] -= 0.005 ether;
                } else {
                    topic.subscriberToBalance[subscriber] = 0;
                }

                topic.subscriberToMessages[subscriber].push(_message);

                emit MessageReceived(_topicName, _message, subscriber);
            }

            if (topic.subscriberToBalance[subscriber] == 0) {
                address lastSubscriber = topic.subscribers[topic.subscribers.length - 1];
                topic.subscribers[i] = lastSubscriber;
                topic.subscribers.pop();

                delete topic.subscriberToBalance[subscriber];
                delete topic.subscriberToMessages[subscriber];
            } else {
                i++;
            }
        }
    }

    function unsubscribe(string memory _topicName) public {
        Topic storage topic = topics[_topicName];
        require(bytes(topic.name).length != 0, "Topic does not exist");

        uint bal = topic.subscriberToBalance[msg.sender];
        require(bal > 0, "Not subscribed or no balance remaining");

        payable(msg.sender).transfer(bal);

        for (uint i = 0; i < topic.subscribers.length; i++) {
            if (topic.subscribers[i] == msg.sender) {
                topic.subscribers[i] = topic.subscribers[topic.subscribers.length - 1];
                topic.subscribers.pop();
                break;
            }
        }

        delete topic.subscriberToBalance[msg.sender];
        delete topic.subscriberToMessages[msg.sender];
    }

    function getTopicPublishers(string memory _topicName) public view returns(address[] memory) {
        return topics[_topicName].publishers;
    }
    function getTopicSubscribers(string memory _topicName) public view returns(address[] memory) {
        return topics[_topicName].subscribers;
    }
    function getSubscriberMessages(string memory _topicName, address _subscriber) public view returns(string[] memory) {
        return topics[_topicName].subscriberToMessages[_subscriber];
    }
    function getSubscriberBalance(string memory _topicName, address _subscriber) public view returns(uint) {
        return topics[_topicName].subscriberToBalance[_subscriber];
    }
}
